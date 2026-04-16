package prediction

import (
	"fmt"
	"math"
)

// AMMEngine implements the Logarithmic Market Scoring Rule (LMSR) for binary markets.
//
// Cost function:  C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
// YES price:      p_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
// NO price:       p_no  = 1 - p_yes
//
// b is the liquidity parameter: higher b = more liquidity, lower slippage per trade.
type AMMEngine struct{}

// PriceYes returns the current YES price as a float in [0, 1] given outstanding shares.
func (a *AMMEngine) PriceYes(qYes, qNo, b float64) float64 {
	if b <= 0 {
		return 0.5
	}
	eYes := math.Exp(qYes / b)
	eNo := math.Exp(qNo / b)
	return eYes / (eYes + eNo)
}

// PriceNo returns the current NO price as a float in [0, 1].
func (a *AMMEngine) PriceNo(qYes, qNo, b float64) float64 {
	return 1.0 - a.PriceYes(qYes, qNo, b)
}

// PriceCentsYes returns the YES price in cents (1-99).
func (a *AMMEngine) PriceCentsYes(qYes, qNo, b float64) int {
	p := a.PriceYes(qYes, qNo, b)
	cents := int(math.Round(p * 100))
	if cents < 1 {
		cents = 1
	}
	if cents > 99 {
		cents = 99
	}
	return cents
}

// PriceCentsNo returns the NO price in cents (1-99).
func (a *AMMEngine) PriceCentsNo(qYes, qNo, b float64) int {
	return 100 - a.PriceCentsYes(qYes, qNo, b)
}

// cost computes the LMSR cost function value: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
func (a *AMMEngine) cost(qYes, qNo, b float64) float64 {
	if b <= 0 {
		return 0
	}
	// Use log-sum-exp for numerical stability:
	// ln(e^a + e^b) = max(a,b) + ln(1 + e^(min(a,b)-max(a,b)))
	aVal := qYes / b
	bVal := qNo / b
	maxV := math.Max(aVal, bVal)
	minV := math.Min(aVal, bVal)
	return b * (maxV + math.Log1p(math.Exp(minV-maxV)))
}

// CostForTrade returns the cost in cents to buy `qty` contracts of the given side.
// Positive cost means the trader pays; the AMM collects.
func (a *AMMEngine) CostForTrade(qYes, qNo, b float64, side OrderSide, qty int) (int64, error) {
	if qty <= 0 {
		return 0, fmt.Errorf("quantity must be positive, got %d", qty)
	}
	if b <= 0 {
		return 0, fmt.Errorf("liquidity parameter b must be positive, got %f", b)
	}

	costBefore := a.cost(qYes, qNo, b)

	var costAfter float64
	switch side {
	case OrderSideYes:
		costAfter = a.cost(qYes+float64(qty), qNo, b)
	case OrderSideNo:
		costAfter = a.cost(qYes, qNo+float64(qty), b)
	default:
		return 0, fmt.Errorf("invalid side: %s", side)
	}

	// Cost in abstract units; convert to cents (1 share = 100 cents at price 1.0)
	costUnits := costAfter - costBefore
	costCents := int64(math.Ceil(costUnits * 100))
	if costCents < 1 {
		costCents = 1
	}
	return costCents, nil
}

// CalculateFee computes the fee for a trade in cents.
// Fee = feeRateBps/10000 * min(price, 1-price) * quantity * 100
// This mirrors the Polymarket fee model: symmetric around 50/50.
func (a *AMMEngine) CalculateFee(priceCents int, quantity int, feeRateBps int) int64 {
	if feeRateBps <= 0 || quantity <= 0 {
		return 0
	}
	p := float64(priceCents) / 100.0
	minP := math.Min(p, 1.0-p)
	fee := float64(feeRateBps) / 10000.0 * minP * float64(quantity) * 100.0
	return int64(math.Ceil(fee))
}

// PreviewTrade returns an OrderPreview showing the expected cost and price impact.
func (a *AMMEngine) PreviewTrade(market *Market, side OrderSide, action OrderAction, qty int) (*OrderPreview, error) {
	if action == OrderActionSell {
		return nil, fmt.Errorf("sell against AMM not yet supported; requires existing position")
	}
	if market.Status != MarketStatusOpen {
		return nil, fmt.Errorf("market is not open for trading (status: %s)", market.Status)
	}

	b := market.AMMLiquidityParam
	costCents, err := a.CostForTrade(market.AMMYesShares, market.AMMNoShares, b, side, qty)
	if err != nil {
		return nil, err
	}

	feeCents := a.CalculateFee(market.YesPriceCents, qty, market.FeeRateBps)

	// Compute new prices after trade
	newQYes, newQNo := market.AMMYesShares, market.AMMNoShares
	switch side {
	case OrderSideYes:
		newQYes += float64(qty)
	case OrderSideNo:
		newQNo += float64(qty)
	}
	newYesPrice := a.PriceCentsYes(newQYes, newQNo, b)

	// Max profit: if your side wins, each contract pays 100¢
	maxProfit := int64(qty)*100 - costCents - feeCents
	maxLoss := costCents + feeCents

	return &OrderPreview{
		Side:        side,
		Action:      action,
		Quantity:    qty,
		PriceCents:  a.PriceCentsYes(market.AMMYesShares, market.AMMNoShares, b),
		TotalCost:   costCents,
		FeeCents:    feeCents,
		MaxProfit:   maxProfit,
		MaxLoss:     maxLoss,
		NewYesPrice: newYesPrice,
		NewNoPrice:  100 - newYesPrice,
	}, nil
}

// ExecuteTrade processes a buy order against the AMM, updating the market's share
// quantities and prices. Returns the cost in cents and the new prices.
// The caller is responsible for wallet operations and persisting the market update.
func (a *AMMEngine) ExecuteTrade(market *Market, side OrderSide, qty int) (costCents int64, feeCents int64, err error) {
	if market.Status != MarketStatusOpen {
		return 0, 0, fmt.Errorf("market %s is not open (status: %s)", market.Ticker, market.Status)
	}

	b := market.AMMLiquidityParam
	costCents, err = a.CostForTrade(market.AMMYesShares, market.AMMNoShares, b, side, qty)
	if err != nil {
		return 0, 0, err
	}

	feeCents = a.CalculateFee(market.YesPriceCents, qty, market.FeeRateBps)

	// Update AMM state
	switch side {
	case OrderSideYes:
		market.AMMYesShares += float64(qty)
	case OrderSideNo:
		market.AMMNoShares += float64(qty)
	}

	// Recalculate prices
	market.YesPriceCents = a.PriceCentsYes(market.AMMYesShares, market.AMMNoShares, b)
	market.NoPriceCents = 100 - market.YesPriceCents
	market.LastTradePriceCents = &market.YesPriceCents
	market.VolumeCents += costCents
	market.OpenInterestCents += int64(qty) * 100

	return costCents, feeCents, nil
}
