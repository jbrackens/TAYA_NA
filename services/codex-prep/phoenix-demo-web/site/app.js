const state = {
  auth: loadAuth(),
  publicData: {
    banners: [],
    promotions: [],
    pages: [],
    sports: [],
    events: [],
    markets: [],
  },
  privateData: {
    wallet: null,
    transactions: [],
    bets: [],
    profile: null,
    leaderboard: null,
    loyalty: null,
    achievements: null,
    preferences: null,
    limits: null,
    restrictions: null,
  },
  selectedSport: 'all',
  selectedBet: null,
};

const els = {
  sessionPanel: document.getElementById('session-panel'),
  heroAside: document.getElementById('hero-aside'),
  sportFilters: document.getElementById('sport-filters'),
  marketBoard: document.getElementById('market-board'),
  walletSummary: document.getElementById('wallet-summary'),
  transactionsTable: document.getElementById('transactions-table'),
  betsGrid: document.getElementById('bets-grid'),
  loyaltyCard: document.getElementById('loyalty-card'),
  achievementsCard: document.getElementById('achievements-card'),
  leaderboardCard: document.getElementById('leaderboard-card'),
  profileCard: document.getElementById('profile-card'),
  notificationCard: document.getElementById('notification-card'),
  limitsCard: document.getElementById('limits-card'),
  restrictionsCard: document.getElementById('restrictions-card'),
  bannerRail: document.getElementById('banner-rail'),
  promotionRail: document.getElementById('promotion-rail'),
  pagesRail: document.getElementById('pages-rail'),
  betslipEmpty: document.getElementById('betslip-empty'),
  betslipContent: document.getElementById('betslip-content'),
  selectedBet: document.getElementById('selected-bet'),
  toast: document.getElementById('toast'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  betForm: document.getElementById('bet-form'),
  depositForm: document.getElementById('deposit-form'),
};

function loadAuth() {
  try {
    const raw = localStorage.getItem('phoenix-demo-auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth() {
  if (state.auth) {
    localStorage.setItem('phoenix-demo-auth', JSON.stringify(state.auth));
  } else {
    localStorage.removeItem('phoenix-demo-auth');
  }
}

function showToast(message, type = 'info') {
  els.toast.textContent = message;
  els.toast.style.borderColor = type === 'error' ? 'rgba(255,113,113,0.45)' : type === 'success' ? 'rgba(66,211,146,0.45)' : 'rgba(24,209,255,0.35)';
  els.toast.classList.add('show');
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => els.toast.classList.remove('show'), 2600);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (options.auth && state.auth?.access_token) headers.Authorization = `Bearer ${state.auth.access_token}`;
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!response.ok) {
    const message = data?.error?.message || data?.message || response.statusText;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    if (response.status === 401) {
      state.auth = null;
      persistAuth();
      renderSession();
    }
    throw error;
  }
  return data;
}

function money(value) {
  if (value == null) return '—';
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return String(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function ts(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function renderSession() {
  if (!state.auth) {
    els.sessionPanel.innerHTML = '<div class="notice">Guest mode. Public content is live; login unlocks wallet, bets, and account surfaces.</div>';
    return;
  }
  els.sessionPanel.innerHTML = `
    <div class="notice success">
      <strong>${escapeHtml(state.auth.user.username)}</strong><br />
      <span class="muted">${escapeHtml(state.auth.user.email)}</span><br />
      <button class="btn btn-ghost" id="logout-button">Logout</button>
    </div>
  `;
  document.getElementById('logout-button').addEventListener('click', async () => {
    try {
      if (state.auth?.refresh_token) {
        await api('/auth/logout', { method: 'POST', auth: true, body: { refresh_token: state.auth.refresh_token } }).catch(() => null);
      }
    } finally {
      state.auth = null;
      state.privateData = { wallet: null, transactions: [], bets: [], profile: null, leaderboard: null, loyalty: null, achievements: null, preferences: null, limits: null, restrictions: null };
      persistAuth();
      renderAll();
      showToast('Logged out.', 'success');
    }
  });
}

function renderHero() {
  const banner = state.publicData.banners[0];
  const promotion = state.publicData.promotions[0];
  els.heroAside.innerHTML = `
    <div class="hero-banner">
      <p class="eyebrow">${banner ? 'Homepage hero' : 'Demo credentials'}</p>
      <div class="banner-title">${escapeHtml(banner?.title || 'demoplayer / Password123!')}</div>
      <p class="muted">${escapeHtml(promotion?.name || 'Use the seeded player to jump straight into the sportsbook flow.')}</p>
      <div class="pill-row">
        <span class="status-pill info">${escapeHtml(state.publicData.sports.length ? `${state.publicData.sports.length} sports live` : 'Go services connected')}</span>
        <span class="status-pill success">${escapeHtml(state.publicData.markets.length ? `${state.publicData.markets.length} markets loaded` : 'Ready for seed data')}</span>
      </div>
    </div>
  `;
}

function renderSportFilters() {
  const sports = [{ id: 'all', name: 'All sports' }, ...state.publicData.sports.map((sport) => ({ id: sport.id, name: sport.name }))];
  els.sportFilters.innerHTML = sports.map((sport) => `
    <button class="btn ${state.selectedSport === sport.id ? 'btn-primary' : 'btn-secondary'}" data-sport="${escapeHtml(sport.id)}">${escapeHtml(sport.name)}</button>
  `).join('');
  els.sportFilters.querySelectorAll('[data-sport]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedSport = button.dataset.sport;
      renderSportFilters();
      renderMarkets();
    });
  });
}

function filteredMarkets() {
  return state.publicData.markets.filter((market) => state.selectedSport === 'all' || market.sport === state.selectedSport);
}

function renderMarkets() {
  const eventsById = new Map(state.publicData.events.map((event) => [event.event_id, event]));
  const groups = new Map();
  for (const market of filteredMarkets()) {
    const event = eventsById.get(market.event_id);
    const key = `${market.sport || 'other'}::${market.league || event?.league || 'General'}`;
    const bucket = groups.get(key) || { sport: market.sport || event?.sport || 'other', league: market.league || event?.league || 'General', items: [] };
    bucket.items.push({ market, event });
    groups.set(key, bucket);
  }
  if (!groups.size) {
    els.marketBoard.innerHTML = '<div class="empty-state">No seeded markets yet. Run the demo seed step and refresh.</div>';
    return;
  }
  els.marketBoard.innerHTML = Array.from(groups.values()).map((group) => `
    <article class="market-group">
      <header>
        <div>
          <p class="eyebrow">${escapeHtml(group.sport)}</p>
          <h4>${escapeHtml(group.league)}</h4>
        </div>
        <span class="status-pill info">${group.items.length} market${group.items.length === 1 ? '' : 's'}</span>
      </header>
      <div class="market-list">
        ${group.items.map(({ market, event }) => {
          const title = market.event_name || [event?.home_team, event?.away_team].filter(Boolean).join(' vs ') || event?.name || 'Upcoming event';
          return `
            <div class="market-row">
              <div class="market-meta">
                <div class="market-name">${escapeHtml(title)}</div>
                <div class="market-subtitle">
                  <span>${escapeHtml(market.market_type)}</span>
                  <span>${escapeHtml(event?.status || market.status)}</span>
                  <span>${escapeHtml(event?.scheduled_start ? ts(event.scheduled_start) : market.scheduled_start ? ts(market.scheduled_start) : 'TBD')}</span>
                </div>
              </div>
              <div class="outcome-grid">
                ${market.outcomes.map((outcome) => {
                  const active = state.selectedBet?.market_id === market.market_id && state.selectedBet?.outcome_id === outcome.outcome_id;
                  return `
                    <button class="outcome-btn ${active ? 'active' : ''}" data-market='${JSON.stringify(market).replace(/'/g, '&apos;')}' data-outcome='${JSON.stringify(outcome).replace(/'/g, '&apos;')}'>
                      <span>${escapeHtml(outcome.name)}</span>
                      <strong>${escapeHtml(outcome.odds ?? market.odds?.[outcome.outcome_id] ?? '—')}</strong>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </article>
  `).join('');

  els.marketBoard.querySelectorAll('.outcome-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const market = JSON.parse(button.dataset.market.replace(/&apos;/g, "'"));
      const outcome = JSON.parse(button.dataset.outcome.replace(/&apos;/g, "'"));
      selectOutcome(market, outcome);
    });
  });
}

function selectOutcome(market, outcome) {
  state.selectedBet = {
    market_id: market.market_id,
    market_name: market.event_name || market.market_type,
    outcome_id: outcome.outcome_id,
    outcome_name: outcome.name,
    odds: outcome.odds || market.odds?.[outcome.outcome_id],
    user_id: state.auth?.user.user_id || '',
  };
  renderMarkets();
  renderBetslip();
}

function renderBetslip() {
  if (!state.selectedBet) {
    els.betslipEmpty.classList.remove('hidden');
    els.betslipContent.classList.add('hidden');
    return;
  }
  els.betslipEmpty.classList.add('hidden');
  els.betslipContent.classList.remove('hidden');
  const stakeInput = Number(els.betForm?.stake?.value || 10);
  const odds = Number(state.selectedBet.odds || 0);
  const payout = odds && stakeInput ? stakeInput * odds : 0;
  els.selectedBet.innerHTML = `
    <div class="notice">
      <strong>${escapeHtml(state.selectedBet.market_name)}</strong><br />
      <span class="muted">${escapeHtml(state.selectedBet.outcome_name)}</span><br />
      <span class="status-pill success">Odds ${escapeHtml(state.selectedBet.odds)}</span>
      <p class="muted">Potential payout: ${money(payout)}</p>
    </div>
  `;
}

function renderWallet() {
  const wallet = state.privateData.wallet;
  if (!state.auth) {
    els.walletSummary.innerHTML = '<div class="empty-state">Login to unlock wallet actions.</div>';
    els.transactionsTable.innerHTML = '<tr><td colspan="5" class="muted">No wallet session.</td></tr>';
    return;
  }
  if (!wallet) {
    els.walletSummary.innerHTML = '<div class="empty-state">No wallet yet. Use Create wallet to initialise the player ledger.</div>';
    els.transactionsTable.innerHTML = '<tr><td colspan="5" class="muted">No transactions yet.</td></tr>';
    return;
  }
  els.walletSummary.innerHTML = `
    <div class="metric-grid">
      <div class="metric"><span class="muted">Balance</span><strong>${money(wallet.balance)}</strong></div>
      <div class="metric"><span class="muted">Reserved</span><strong>${money(wallet.reserved)}</strong></div>
      <div class="metric"><span class="muted">Available</span><strong>${money(wallet.available)}</strong></div>
    </div>
    <p class="muted">Currency ${escapeHtml(wallet.currency)} · Updated ${escapeHtml(ts(wallet.last_updated))}</p>
  `;
  els.transactionsTable.innerHTML = state.privateData.transactions.length ? state.privateData.transactions.map((tx) => `
    <tr>
      <td>${escapeHtml(ts(tx.timestamp))}</td>
      <td>${escapeHtml(tx.type)}</td>
      <td>${escapeHtml(money(tx.amount))}</td>
      <td>${escapeHtml(money(tx.balance_after))}</td>
      <td>${escapeHtml(tx.reference || tx.description || '—')}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" class="muted">No transactions yet.</td></tr>';
}

function renderBets() {
  if (!state.auth) {
    els.betsGrid.innerHTML = '<div class="empty-state">Login to inspect placed bets.</div>';
    return;
  }
  els.betsGrid.innerHTML = state.privateData.bets.length ? state.privateData.bets.map((bet) => `
    <article class="subcard">
      <p class="eyebrow">${escapeHtml(bet.status)}</p>
      <h4>${escapeHtml(bet.bet_type || 'single bet')}</h4>
      <div class="pill-row">
        <span>${escapeHtml(`Stake ${money(bet.stake)}`)}</span>
        <span>${escapeHtml(`Potential ${money(bet.potential_payout)}`)}</span>
        <span>${escapeHtml(`Odds ${bet.odds}`)}</span>
      </div>
      <p class="muted">Placed ${escapeHtml(ts(bet.placed_at))}</p>
    </article>
  `).join('') : '<div class="empty-state">No bets yet. Place one from the market board.</div>';
}

function renderRewards() {
  if (!state.auth) {
    els.loyaltyCard.innerHTML = '<h4>Loyalty</h4><p class="muted">Login to view loyalty points.</p>';
    els.achievementsCard.innerHTML = '<h4>Achievements</h4><p class="muted">Login to view unlocked achievements.</p>';
    els.leaderboardCard.innerHTML = '<h4>Leaderboard</h4><p class="muted">Login to view the live leaderboard snapshot.</p>';
    return;
  }
  const loyalty = state.privateData.loyalty;
  els.loyaltyCard.innerHTML = loyalty ? `
    <h4>Loyalty points</h4>
    <div class="metric-grid">
      <div class="metric"><span class="muted">Total</span><strong>${escapeHtml(loyalty.total_points)}</strong></div>
      <div class="metric"><span class="muted">Available</span><strong>${escapeHtml(loyalty.available_points)}</strong></div>
      <div class="metric"><span class="muted">Reserved</span><strong>${escapeHtml(loyalty.reserved_points)}</strong></div>
    </div>
  ` : '<h4>Loyalty points</h4><p class="muted">No loyalty data yet.</p>';

  const achievements = state.privateData.achievements?.achievements || [];
  els.achievementsCard.innerHTML = `
    <h4>Achievements</h4>
    <div class="list-stack">
      ${achievements.length ? achievements.map((item) => `
        <div class="list-card">
          <strong>${escapeHtml(item.achievement_id)}</strong>
          <p class="muted">${escapeHtml(item.description || 'Unlocked achievement')}</p>
          <span class="status-pill success">${escapeHtml(`${item.reward_points} pts`)}</span>
        </div>
      `).join('') : '<p class="muted">No unlocked achievements yet.</p>'}
    </div>
  `;

  const leaderboard = state.privateData.leaderboard?.entries || [];
  els.leaderboardCard.innerHTML = `
    <h4>Leaderboard</h4>
    <div class="list-stack">
      ${leaderboard.length ? leaderboard.map((entry) => `
        <div class="list-card">
          <strong>#${escapeHtml(entry.rank)} ${escapeHtml(entry.username)}</strong>
          <p class="muted">Value ${escapeHtml(entry.value)}</p>
        </div>
      `).join('') : '<p class="muted">No leaderboard entries available yet.</p>'}
    </div>
  `;
}

function renderAccount() {
  if (!state.auth) {
    els.profileCard.innerHTML = '<h4>Profile</h4><p class="muted">Login to load account, social, notification, and compliance surfaces.</p>';
    els.notificationCard.innerHTML = '<h4>Notification preferences</h4><p class="muted">No active session.</p>';
    els.limitsCard.innerHTML = '<h4>Deposit / loss limits</h4><p class="muted">No active session.</p>';
    els.restrictionsCard.innerHTML = '<h4>Restrictions</h4><p class="muted">No active session.</p>';
    return;
  }
  const user = state.auth.user;
  const profile = state.privateData.profile;
  els.profileCard.innerHTML = `
    <h4>${escapeHtml(profile?.display_name || user.username)}</h4>
    <p class="muted">${escapeHtml(user.email)}</p>
    <div class="pill-row">
      <span>${escapeHtml(`Role ${user.status || 'player'}`)}</span>
      <span>${escapeHtml(`Followers ${profile?.follower_count ?? 0}`)}</span>
      <span>${escapeHtml(`Following ${profile?.following_count ?? 0}`)}</span>
    </div>
  `;

  const prefs = state.privateData.preferences?.preferences;
  els.notificationCard.innerHTML = prefs ? `
    <h4>Notification preferences</h4>
    <div class="list-stack">
      <div class="list-card">Marketing emails: <strong>${prefs.marketing_emails ? 'on' : 'off'}</strong></div>
      <div class="list-card">Bet notifications: <strong>${prefs.bet_notifications ? 'on' : 'off'}</strong></div>
      <div class="list-card">Promotional SMS: <strong>${prefs.promotional_sms ? 'on' : 'off'}</strong></div>
      <div class="list-card">Push notifications: <strong>${prefs.push_notifications ? 'on' : 'off'}</strong></div>
    </div>
  ` : '<h4>Notification preferences</h4><p class="muted">No notification preferences returned.</p>';

  const limits = state.privateData.limits?.limits || [];
  els.limitsCard.innerHTML = `
    <h4>Limits</h4>
    <div class="list-stack">
      ${limits.length ? limits.map((limit) => `
        <div class="list-card">
          <strong>${escapeHtml(limit.limit_type)}</strong>
          <p class="muted">${escapeHtml(money(limit.limit_amount))} ${escapeHtml(limit.currency || '')}</p>
        </div>
      `).join('') : '<p class="muted">No active limits configured.</p>'}
    </div>
  `;

  const restrictions = state.privateData.restrictions?.restrictions || [];
  els.restrictionsCard.innerHTML = `
    <h4>Restrictions</h4>
    <div class="list-stack">
      ${restrictions.length ? restrictions.map((restriction) => `
        <div class="list-card">
          <strong>${escapeHtml(restriction.type)}</strong>
          <p class="muted">Exceeded: ${escapeHtml(restriction.exceeded ? 'yes' : 'no')}</p>
        </div>
      `).join('') : '<p class="muted">No active restrictions returned.</p>'}
    </div>
  `;
}

function renderContentRail() {
  els.bannerRail.innerHTML = state.publicData.banners.map((banner) => `
    <div class="list-card">
      <strong>${escapeHtml(banner.title)}</strong>
      <p class="muted">${escapeHtml(banner.position || 'homepage_hero')}</p>
    </div>
  `).join('') || '<p class="muted">No banners seeded.</p>';
  els.promotionRail.innerHTML = state.publicData.promotions.map((promo) => `
    <div class="list-card">
      <strong>${escapeHtml(promo.name)}</strong>
      <p class="muted">${escapeHtml(promo.status || promo.promotion_type || '')}</p>
    </div>
  `).join('') || '<p class="muted">No promotions seeded.</p>';
  els.pagesRail.innerHTML = state.publicData.pages.map((page) => `
    <div class="list-card">
      <strong>${escapeHtml(page.title)}</strong>
      <p class="muted">/${escapeHtml(page.slug)}</p>
    </div>
  `).join('') || '<p class="muted">No CMS pages seeded.</p>';
}

function renderAll() {
  renderSession();
  renderHero();
  renderSportFilters();
  renderMarkets();
  renderWallet();
  renderBets();
  renderRewards();
  renderAccount();
  renderContentRail();
  renderBetslip();
}

async function loadPublicData() {
  const [sports, events, markets, pages, promotions, banners] = await Promise.all([
    api('/api/v1/sports').catch(() => ({ sports: [] })),
    api('/api/v1/events').catch(() => ({ data: [] })),
    api('/api/v1/markets').catch(() => ({ data: [] })),
    api('/api/v1/pages?published=true').catch(() => ({ data: [] })),
    api('/api/v1/promotions').catch(() => ({ data: [] })),
    api('/api/v1/banners?position=homepage_hero').catch(() => ({ data: [] })),
  ]);
  state.publicData.sports = sports.sports || [];
  state.publicData.events = events.data || [];
  state.publicData.markets = markets.data || [];
  state.publicData.pages = pages.data || [];
  state.publicData.promotions = promotions.data || [];
  state.publicData.banners = banners.data || [];
}

async function loadPrivateData() {
  if (!state.auth?.user?.user_id) return;
  const userID = state.auth.user.user_id;
  const results = await Promise.allSettled([
    api(`/api/v1/wallets/${userID}`, { auth: true }),
    api(`/api/v1/wallets/${userID}/transactions?limit=20`, { auth: true }),
    api(`/api/v1/users/${userID}/bets?limit=20`, { auth: true }),
    api(`/api/v1/users/${userID}`, { auth: true }),
    api(`/api/v1/users/${userID}/profile`, { auth: true }),
    api(`/api/v1/leaderboards?type=weekly&metric=profit&limit=5`, { auth: true }),
    api(`/api/v1/users/${userID}/loyalty-points`, { auth: true }),
    api(`/api/v1/users/${userID}/achievements`, { auth: true }),
    api(`/api/v1/users/${userID}/notification-preferences`, { auth: true }),
    api(`/api/v1/users/${userID}/limits`, { auth: true }),
    api(`/api/v1/users/${userID}/restrictions`, { auth: true }),
  ]);
  const [wallet, transactions, bets, user, profile, leaderboard, loyalty, achievements, prefs, limits, restrictions] = results.map((result) => result.status === 'fulfilled' ? result.value : null);
  state.privateData.wallet = wallet;
  state.privateData.transactions = transactions?.data || [];
  state.privateData.bets = bets?.data || [];
  state.privateData.profile = profile || user || null;
  state.privateData.leaderboard = leaderboard;
  state.privateData.loyalty = loyalty;
  state.privateData.achievements = achievements;
  state.privateData.preferences = prefs;
  state.privateData.limits = limits;
  state.privateData.restrictions = restrictions;
}

async function login(identifier, password) {
  const response = await api('/auth/login', { method: 'POST', body: { identifier, password } });
  state.auth = response;
  persistAuth();
  await loadPrivateData();
  renderAll();
  showToast(`Logged in as ${response.user.username}.`, 'success');
}

async function registerAccount(formData) {
  await api('/api/v1/users', { method: 'POST', body: formData });
  await login(formData.username, formData.password);
  showToast('Account created and logged in.', 'success');
}

async function createWallet() {
  if (!state.auth?.user?.user_id) throw new Error('Login required');
  await api(`/api/v1/wallets/${state.auth.user.user_id}`, { method: 'POST', auth: true, body: { currency: 'USD' } });
  await loadPrivateData();
  renderWallet();
  showToast('Wallet created.', 'success');
}

async function deposit(amount) {
  if (!state.auth?.user?.user_id) throw new Error('Login required');
  await api(`/api/v1/wallets/${state.auth.user.user_id}/deposits`, {
    method: 'POST',
    auth: true,
    body: { amount: Number(amount), payment_method: 'card', payment_token: `demo-${Date.now()}`, currency: 'USD' },
  });
  await loadPrivateData();
  renderWallet();
  showToast(`Deposited ${money(amount)}.`, 'success');
}

async function placeBet(stake) {
  if (!state.auth?.user?.user_id) throw new Error('Login required');
  if (!state.selectedBet) throw new Error('Select a market first');
  const body = {
    user_id: state.auth.user.user_id,
    market_id: state.selectedBet.market_id,
    outcome_id: state.selectedBet.outcome_id,
    stake: Number(stake),
    odds_type: 'decimal',
    acceptance: 'auto',
    odds: Number(state.selectedBet.odds),
  };
  await api('/api/v1/bets', { method: 'POST', auth: true, body });
  state.selectedBet = null;
  await Promise.all([loadPublicData(), loadPrivateData()]);
  renderAll();
  showToast('Bet placed.', 'success');
}

function bindEvents() {
  document.getElementById('scroll-markets').addEventListener('click', () => document.getElementById('sportsbook').scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('scroll-auth').addEventListener('click', () => document.getElementById('auth-rail').scrollIntoView({ behavior: 'smooth' }));
  document.getElementById('refresh-wallet').addEventListener('click', async () => {
    await loadPrivateData();
    renderWallet();
    showToast('Wallet refreshed.', 'success');
  });
  document.getElementById('refresh-bets').addEventListener('click', async () => {
    await loadPrivateData();
    renderBets();
    showToast('Bets refreshed.', 'success');
  });
  document.getElementById('create-wallet').addEventListener('click', async () => {
    try { await createWallet(); } catch (error) { showToast(error.message, 'error'); }
  });
  els.depositForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const amount = new FormData(event.currentTarget).get('amount');
      await deposit(amount);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  els.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await login(String(formData.get('identifier') || ''), String(formData.get('password') || ''));
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  els.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      await registerAccount(payload);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  els.betForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const stake = new FormData(event.currentTarget).get('stake');
    try {
      await placeBet(stake);
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function init() {
  bindEvents();
  try {
    await loadPublicData();
    if (state.auth) await loadPrivateData();
    renderAll();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

init();
