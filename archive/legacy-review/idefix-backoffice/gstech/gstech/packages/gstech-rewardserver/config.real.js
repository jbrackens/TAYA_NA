/* @flow */
import type { Configuration } from 'gstech-core/modules/types/config';
import type { RewardserverConfiguration } from './types/config';

const config: Configuration<RewardserverConfiguration> = {
  publicKey: '6AFW6Ko25Hoagc50K/OteolSgHdwAddxFiTez/oZUSM=|/x/OVP7Maux5RDwl27zlI16NaAExrh3gKvDIhszyNyE=',
  data: {
    sheets: {
      LD: {
        games: '0AhYvpqGIu7rZdHo0THYyUWYwa0RjSHpsUE93SUZPdWc',
        rewards: '1l6jTdRB5AbI8PEYbW3uNHLMEa5WMqCm8lY_QPQk-6AM',
      },
      OS: {
        games: '1fPJa0dQXmBPDBE3Oive5uRmryVIcGE3HWX6gZZokjic',
        rewards: '1C9m1WZpaFxnWVQvbDiMIMOnrayPTd1Xg0__hdq1-uKs',
      },
      KK: {
        games: '1rKPtDIspQV_pjaG-7XuBen4oD_ubfEgpGUuExSo7Q1I',
        rewards: '1fzzG0NQUriXf3MAabHxLqafVxOLReC7Vf2_swEVnaIw',
      },
      CJ: {
        games: '0AhYvpqGIu7rZdDFPVWRabnRjNlJwUlRwTGVlcUVNZ1E',
        rewards: '1S56xOw8g1FZyYIOuWt-U76PRrr5ulDQgeMnlWGSQFi0',
      },
    },
    google: {
      api: {
        cache: false,
        type: 'service_account',
        project_id: 'idefix-184208',
        private_key_id: '64469b707949d5c4118a98d83cfd20e25f95370a',
        private_key:
          // eslint-disable-next-line max-len
         'GS[7FF3ngrqm/o5fKc4G6mi1URd7hKUJruZF9cN1pw7BdKgqfQUmm5ue+QDE/MSxxc9uT9bl44GEzzvqOhSX0VUQ+bIpXqS3r+l3MtacPDwUkBsVylnWF6r+rZlnqmloCE4/E9MgHXXgpZmyb1HgHBJP8y59pRI2bCtJhs1iqkrpgwW35ueSxVFz0mQhVDratyBRXrnNxfsyepfmGxsUaQK1YcCGSb52yHgjbd5iat2XHJ6xKPNCLjl2vX1RX4+3shfXG/IKFArAnPIPmWqZBkMsDdfsyLuvHoG7UlbdnEZzEaqLyhlZQvEYfeGeBnZGSE0bNQFFuLD+vV0CpEmi3Zxlm1XbiTFb/dqq6Qk+xrUaKEJ1bnVGtYHeYJns/e5looKIUB/LsZzJHrzE0x/ucf1pyP9ZKkhJJUd9Tzr0YLk8t69GjdSbo0CreVmKRjVX0kX+COWsr9f1wW5I7uBA4Sd29hdGWDEl3VJcjw/G5dF1XJLhjcBt06YMZXoQXKYOeyk7y0jncQHRIWSbD8c2S5Js5dxVy6kvzK1Bx4tuI9nJL4Mx+xRPWRB9R1yRlCqhz2CDZRC2qHtT+Imv0fPDDX4mRXdLBpmmNHHCW+2S3GyMgyleJoc9XpNgzf6RvB1q/PcGu9bCgGS3A8tZu/GvbG7JUjQVhmkHYsc587eB2FaUeA4dTmJnDs7aBiSRjd5YXbriLgL+G94BbjOMKBzNuNPcIuj3mCYKss7q2qtSwQ4Tm15aQp+KkjrUPP9FvJsmDK4gSnNuq3S4ERAgnZuy6ncbpnzJVX6m4jpzwes5SR7/LtzlNopIRhXzDlvenZOfxUZMCEtTgXMqL1mb6gOIu4g2SR1Zyso4xqse7UAxKdiHGoVq0VABFm4fn8W2/6Rvcp0jcw+d2iUe+zsE3bPOMOHKK7vNlMctFguF3OT3XAUFUUQAA4V/jiFH+jnNLC4OvzfUBlkXqq2JfvU4VF3iyyhICA/Ia0QhmKQ008OAM1/UjgaZ9ADhRl0gVjQyd/yHehfKFiGUYcWN2PqDtPicWZepD5/d2AQ106uNrZCyUIICRhu/2LJsWd24uXcJTQyL8qcxSEMcsVxMRzlZg0zWh0jmiIxWXSYG3eDJ70iKnNbvdeSzLZR+LSueuSSk2jdFbsQ+Uc5z2/w4w9fUm23+Oi6pf7cswt/lf0HS90ETqE4hjp7GiteESkM4AX4Dm7QP94UpTHzqVn64mCBM58LH2srkL9J34Xm/UnIJfUJOZNKMLstiSRe7cxvY9Dr1Z4CEaHVy2ls8nS5DEFpAbkL3IPetcKVi3LJyaZmQd/cfrpXU/dfXTCZENaSLzrBCWsSorr3gtHKg5cCqKz/QH4uBkrh6L6KumSEvyaOTPDTbbXMqTCQDySQ6GwYOL7yrg1yzGXU4KY/8Fy54bNEVjUwKUPUopc/84x76l+bOnQvBVLoYL/iu5MN/wa/FmByTWPJA5AAoxN9IAwA3Vf0Hx38D5P7NfVMo/Z0GTXB2rMpBZ3gME24sKx4l1HqPgf44ECKkQ/fqI5Aaeh/oTxjlJJoshQgd9Q3NE/16qUGi7P4c7o2Gv7guSLBW0ozxXbf2vm7y2PmGkY0Q+Z2D1aQjx4vx3q4TEeAV256ND46eUwjW/7iI9+VNAG0sZK1y8evZLWnMaCGrVL5F/xlQPEJy8+9iRNN+A4AOVicFzCjPLexBHfmluRmag0KZynnEyAs3xRzQXnDiBY/irB3k7GaXSaoSSVmGEPyP5Y8H0Sc4tS5hFRfiuvm2OMyGUOhZ3StUXZJ9nDx9BNWOi5IJGLDhDmR5qT1mKXxfyX+tfx/oUVLz4Ul4E1Mf4xqt9EtnNYyfI8S7iAV1UAGUi+tbYcNmEw37HdUYiCu8Iwlh0Z8cyaFNckl/rhZEcPupQgpDSJP0ieirhviOsd6oLOx3gEA8ng2i8Q61mH3V25tCWRs+nXT7EkQSLL0RYX24NLYzjqzCb6o7BgGDougSi+8s+VsEyHj+sgZch56PqI+sg8EWcYqDa/Sn+4jZ8JurJk6zi9lIJL/e8S55ZKU3ZISRalHeeYbUmD82fLHwbVIbofCbieutJd8/iPYcAG99knL4k0v/uEIEepcOep80VK1uL/A/McYx86THeMPX7ADRxxVB4bFBtWu9ikSTAGf73+QTTn9x40qeACnJ0qZSxAiwiitFgdTuKelkz+sAx2FtJOKu1fUbeRwcNntvvsuZ1SJFrwXBtgZfsHr/xaJMdk0oLGhBwgkUUmXqtSWQVie0MFXVeR4929LY9GeMPxYS+tEmIo7cAJBCDBlY1TyAD5/tFi662P7cZis]',
        client_email: 'brandserver@idefix-184208.iam.gserviceaccount.com',
        client_id: '102430615635003475635',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url:
          'https://www.googleapis.com/robot/v1/metadata/x509/brandserver%40idefix-184208.iam.gserviceaccount.com',
      },
    },
  },
};

module.exports = config;
