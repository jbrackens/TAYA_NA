import {
  JefeSpinWheel,
  Notification,
  PendingWithdraw,
  Profile,
  Reward,
  Update,
  Exclusion
} from "@brandserver-client/types";
import { Api } from "./types";

// TODO: remove types.ts file and use types as Generics here, for example () => api.get<Response>
function methods(api: any): Api {
  return {
    auth: {
      login: (lang, data) => api.post(`/api/login?_lang=${lang}`, data),
      pnpLogin: () => api.post("/api/login/pnp"),
      logout: () => api.post(`/api/logout`)
    },
    registration: {
      defaultRegistration: (lang, data) =>
        api.post(`/api/register?_lang=${lang}`, data)
    },
    phone: {
      validate: (lang, data) =>
        api.post(`/api/validate/phone?_lang=${lang}`, data),
      sendCode: (lang, data, retry) =>
        api.post("/api/login/request", data, {
          params: {
            _lang: lang,
            retry
          }
        }),
      login: (lang, data) => api.post(`/api/login/complete?_lang=${lang}`, data)
    },
    password: {
      resetRequest: (lang, data, retry) =>
        api.post("/api/password/reset/request", data, {
          params: {
            _lang: lang,
            retry
          }
        }),
      resetComplete: (lang, data) =>
        api.post(`/api/password/reset/complete?_lang=${lang}`, data)
    },
    cms: {
      getPage: (path: string) => api.get(`/api/cms${path}`)
    },
    selfExclusion: {
      remove: data => api.post("/api/selfexclusion/remove", data)
    },
    config: {
      getConfig: () => api.get("/api/config")
    },
    profile: {
      getProfile: () =>
        api
          .get("/api/profile")
          .then((data: { profile: Profile }) => data.profile),
      updateLanguage: (language: string) =>
        api.post("/api/profile", { languageISO: language }),
      changePassword: (data: { password: string; oldPassword: string }) =>
        api.post("/api/password", data),
      selfExclusion: (duration: number) =>
        api.post("/api/selfexclusion", { duration: duration }),
      setPassword: data => api.post("/api/password/set", data)
    },
    games: {
      getGames: () => api.get("/api/init"),
      getFreeGames: (lang: string) =>
        api.get(`/api/init/nonloggedin?_lang=${lang}`)
    },
    game: {
      startGame: game =>
        api
          .post(`/api/start-game/${game}`)
          .then(
            ({
              update,
              game,
              ...rest
            }: {
              update: Update;
              game: Record<string, string>;
            }) => ({
              update,
              startGameOptions: {
                ...game,
                ...rest
              }
            })
          ),
      startFreeGame: freeGame =>
        api
          .post(`/api/start-free-game/${freeGame}`)
          .then(
            ({
              update,
              game,
              ...rest
            }: {
              update: Update;
              game: Record<string, string>;
            }) => ({
              update,
              startGameOptions: {
                ...game,
                ...rest
              }
            })
          ),
      refreshGame: game => api.post(`/api/refresh-game/${game}`)
    },
    locales: {
      getLocales: () => api.get("/api/localizations")
    },
    balance: {
      getBalance: () => api.get("/api/balance")
    },
    realityCheck: {
      getStatistics: () => api.get("/api/statistics")
    },
    campaignDialog: {
      getCampaignDialogContent: (locale, page) =>
        api.get(`/api/page/${locale}/${page}`)
    },
    termsConditions: {
      getBonusTerms: () => api.get("/api/localizations/bonusterms"),
      getPrivacyPolicy: () => api.get("/api/localizations/privacypolicy"),
      getTermsConditions: () => api.get("/api/localizations/tc"),
      confirmTermsConditions: () => api.post("/api/tc-accept", {})
    },
    register: {
      submitRegister: data => api.post("/api/register/complete", data)
    },
    questionnaires: {
      submitQuestionnaire: (id: string, data: any) =>
        api.post(`/api/questionnaire/${id}`, data)
    },
    wheel: {
      getJefeWheel: () => api.get("/api/wheel"),
      playJefeWheel: () =>
        api
          .post("/api/wheel")
          .then(({ html, morespins, bounty }: JefeSpinWheel) => ({
            html,
            morespins,
            bounty
          }))
    },
    transactionHistory: {
      getTransactionHistory: () => api.get("/api/statement")
    },
    notifications: {
      getNotifications: () =>
        api("/api/inbox").then(
          ({ notifications }: { notifications: Notification[] }) =>
            notifications
        ),
      getNotification: (id: string) =>
        api(`/api/inbox/${id}`).then(
          ({ notification }: { notification: Notification }) => notification
        ),
      resendLink: (action: string) =>
        api(action, {
          method: "Post",
          data: new URLSearchParams()
        })
    },
    pendingWithdraw: {
      getPendingWithdraw: () => api("/api/withdraw/pending"),
      removePendingWithdraw: id =>
        api(`/api/withdraw/${id}`, { method: "delete" }).then(
          ({ pending }: { pending: PendingWithdraw[] }) => pending
        )
    },
    subscription: {
      getSubscription: () => api.get("/api/subscription"),
      updateSubscription: (data: URLSearchParams) =>
        api.post("/api/subscription", data),
      resetSubscriptions: () => api.post("/api/subscription/reset")
    },
    subscriptionV2: {
      getSubscription: token =>
        api.get("/api/subscription-v2", {
          params: {
            token
          }
        }),
      updateSubscription: (data, token) =>
        api.put("/api/subscription-v2", data, {
          params: {
            token
          }
        }),
      snoozeSubscription: (data, token) =>
        api.post("/api/subscription-v2/snooze", data, {
          params: {
            token
          }
        })
    },
    rewards: {
      getRewards: () =>
        api("/api/rewards").then(
          ({ rewards }: { rewards: Reward[] }) => rewards
        ),
      getSingleReward: (id: string) =>
        api(`/api/rewards/${id}`, {
          method: "Post",
          data: new URLSearchParams()
        })
    },
    withdraw: {
      getWithdraw: () => api.get("/api/withdraw"),
      withdrawBalance: (data: URLSearchParams) =>
        api.post("/api/withdraw", data),
      checkBankIdentify: (data: URLSearchParams) =>
        api.post("/api/identify", data),
      sendActivationLink: () => api.post("/api/activation/resend", {})
    },
    deposit: {
      getDeposit: () => api("/api/deposit"),
      getDepositProcess: id => api(`/api/deposit/process/${id}`),
      createDeposit: (data: any) =>
        api("/api/deposit", {
          method: "Post",
          data
        }),
      pnp: amount => api.post("/api/deposit/pnp", { amount }),
      register: data => api.post("/api/deposit/register", data)
    },
    depositDone: {
      getDepositDone: () => api.get("/api/deposit-done")
    },
    levels: {
      getLevels: () => api.get("/api/account")
    },
    shop: {
      getShop: () => api.get("/api/shop"),
      getShopItem: (id: string) => api.post(`/api/shop/${id}`)
    },
    bounties: {
      getBounties: () => api.get("/api/bounties"),
      getBounty: (id: string) => api.post(`/api/bounties/${id}`)
    },
    exclusion: {
      getExclusions: () => api.get("/api/limits"),
      setExclusion: (exclusion: Exclusion) =>
        api.post(`/api/limits`, exclusion),
      removeExclusion: (key: string) => api.delete(`/api/limits/${key}`)
    }
  };
}

export default methods;
