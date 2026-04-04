import React, { useEffect, useState, useContext } from "react";
import {
  Table,
  TableRow,
  TableHeader,
  TableCol,
  TableBody,
  Modal,
  Button,
  MergedButtonGroup,
} from "ui";
import { useTranslation } from "next-export-i18n";
import {
  ModalContent,
  WalletCloseButton,
  WalletButtonSection,
  CustomButton,
  Gray,
  ColoredSpan,
  TableContent,
} from "./../index.style";
import TransactionModal from "./../transactionModal";
import { UserIdContext } from "./../userIdContext";
import { useApi } from "../../../../services/api-service";

const transactionInitialData = [
  {
    transactionType: "",
    currencyId: "",
    amount: "",
    exchangeToCurrencyId: "",
    exchangeRate: "",
    projectId: "",
    walletOwnerId: "",
    requesterId: "",
    externalTransactionId: "",
    title: "",
    transactionDate: "",
  },
];

const WalletModal = ({
  show,
  close,
  data,
  loading,
  currencies,
  updateWallet,
}) => {
  const { t } = useTranslation();

  const { currentUserId } = useContext(UserIdContext);

  const [whatToDisplay, setWhatToDisplay] = useState("wallet");
  const [walletData, setWalletData] = useState(data);
  const [currencyId, setCurrencyId] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState("");
  const [projectForTransaction, setProjectForTransaction] = useState("");
  const [transactionList, setTransactionList] = useState([
    {
      transactionType: "",
      currencyId: "",
      amount: "",
      exchangeToCurrencyId: "",
      exchangeRate: "",
      projectId: "",
      walletOwnerId: "",
      requesterId: "",
      externalTransactionId: "",
      title: "",
      transactionDate: "",
    },
  ]);

  const getTransactions: {
    data: any;
    triggerApi: any;
    error: any;
    resetHookState: any;
    isLoading: boolean;
  } = useApi(`wallet/admin/${currentUserId}/transactions/${currencyId}`, "GET");

  useEffect(() => {
    setWalletData(
      data.map((wallet) => ({
        currencyId: wallet.currencyId,
        currencyName: currencies.find(
          (currency) => currency.id === wallet.currencyId,
        )?.name,
        balance: wallet.balanceValue,
      })),
    );
  }, [data, currencies]);

  useEffect(() => {
    if (getTransactions.data && getTransactions.data.status === "ok") {
      setTransactionList(getTransactions.data?.details);
    }
  }, [getTransactions.data]);

  const closeAccountModal = () => {
    close();
    getTransactions.resetHookState();
    setTransactionList(transactionInitialData);
    setWhatToDisplay("wallet");
  };

  const userRows = walletData.map((currency) => (
    <TableRow key={currency.currencyId}>
      <TableCol loading={loading}>{currency.currencyName}</TableCol>
      <TableCol loading={loading}>{currency.balance}</TableCol>
      <TableCol loading={loading}>
        <MergedButtonGroup>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setShowPaymentModal(true);
              setPaymentType("TOPUP");
              setCurrencyId(currency.currencyId);
              setProjectForTransaction(
                currencies.find((curr) => curr.id === currency.currencyId)
                  ?.associatedProjects[0],
              );
            }}
          >
            {t("TOPUP")}
          </CustomButton>
          <CustomButton
            buttonType="white-outline"
            compact
            onClick={() => {
              setShowPaymentModal(true);
              setPaymentType("WITHDRAW");
              setCurrencyId(currency.currencyId);
              setProjectForTransaction(
                currencies.find((curr) => curr.id === currency.currencyId)
                  ?.associatedProjects[0],
              );
            }}
          >
            {t("Withdraw")}
          </CustomButton>
        </MergedButtonGroup>
        <Gray>{" | "}</Gray>
        <CustomButton
          buttonType="white-outline"
          compact
          onClick={() => {
            setCurrencyId(currency.currencyId);
            setTransactionList(transactionInitialData);
            getTransactions.triggerApi();
            setWhatToDisplay("history");
          }}
        >
          {t("History")}
        </CustomButton>
      </TableCol>
    </TableRow>
  ));

  const historyRows = transactionList.map((history, index) => (
    <TableRow key={index}>
      <TableCol loading={getTransactions.isLoading}>
        {history.transactionDate}
      </TableCol>
      <TableCol loading={getTransactions.isLoading}>
        <ColoredSpan $type={history.transactionType}>
          {history.transactionType}
        </ColoredSpan>
      </TableCol>
      <TableCol loading={getTransactions.isLoading}>{history.title}</TableCol>
      <TableCol loading={getTransactions.isLoading}>
        {history.requesterId}
      </TableCol>
      <TableCol loading={getTransactions.isLoading}>
        {history.externalTransactionId}
      </TableCol>
      <TableCol loading={getTransactions.isLoading}>
        <ColoredSpan $type={history.transactionType}>
          {history.amount}
        </ColoredSpan>
      </TableCol>
    </TableRow>
  ));

  const historyEmptyRow = (
    <TableRow>
      <TableCol colSpan={6}>{t("NO_TRANSACTIONS_FOUND")}</TableCol>
    </TableRow>
  );

  const walletTable = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCol>{t("CURRENCY")}</TableCol>
          <TableCol>{t("BALANCE")}</TableCol>
          <TableCol>{t("ACTIONS")}</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>{userRows}</TableBody>
    </Table>
  );

  const walletHistoryTable = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCol>{t("DATE")}</TableCol>
          <TableCol>{t("TYPE")}</TableCol>
          <TableCol>{t("TITLE")}</TableCol>
          <TableCol>{t("TRX_ID")}</TableCol>
          <TableCol>{t("EXT_ID")}</TableCol>
          <TableCol>{t("AMOUNT")}</TableCol>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactionList.length <= 0 ? historyEmptyRow : historyRows}
      </TableBody>
    </Table>
  );

  return (
    <>
      <Modal
        scrollable
        modalheader={`${t("WALLET")} ${
          whatToDisplay === "history" ? whatToDisplay : ""
        }`}
        display={show}
        onCloseButtonClicked={closeAccountModal}
      >
        <ModalContent>
          <TableContent>
            {whatToDisplay === "wallet" && walletTable}
            {whatToDisplay === "history" && walletHistoryTable}
          </TableContent>
          <WalletButtonSection>
            {whatToDisplay !== "wallet" && (
              <Button
                buttonType="white-outline"
                onClick={() => {
                  setWhatToDisplay("wallet");
                  setTransactionList(transactionInitialData);
                }}
              >
                {t("BACK")}
              </Button>
            )}
            <WalletCloseButton onClick={closeAccountModal}>
              {t("CLOSE")}
            </WalletCloseButton>
          </WalletButtonSection>
        </ModalContent>
      </Modal>
      <TransactionModal
        show={showPaymentModal}
        close={() => setShowPaymentModal(false)}
        currencies={currencies}
        updateWallet={updateWallet}
        currencyId={currencyId}
        paymentType={paymentType}
        projectForTransaction={projectForTransaction}
      />
    </>
  );
};

export default WalletModal;
