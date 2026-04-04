#!/usr/bin/env bash

#region Rewardserver
export RSG="thumbnails games \
	reward_definitions rewards \
	ledgers progresses \
	progresses_ledgers progresses_rewards game_progresses \
	ledgers_events"
#endregion

#region Campaignserver
CSBASE="countries subscription_options \
	players deposits content_type content campaign_groups"
export CSC="$CSBASE campaigns \
	campaigns_content campaigns_players \
	audience_rules reward_rules \
	events credited_rewards campaigns_deposits"
#endregion Campaignserver

#region gstech
GSNOFK="brands affiliates users persons risk_types game_manufacturers conversion_rate_histories"
GSROOT="$GSNOFK bonuses segments"
GSRSK="risk_types risks"
GSGMS="games game_profiles brand_game_profiles promotions promotion_games"
GSLOC="countries languages currencies conversion_rate_histories"
GSQST="questionnaires questionnaire_questions"
GSPAY="$GSLOC payment_methods payment_providers payment_provider_countries payment_provider_currencies payment_provider_limits"
GSBASE="$GSROOT $GSLOC $GSGMS $GSQST $GSRSK $GSPAY"
GSPLYRS="$GSBASE persons players \
	player_questionnaires player_questionnaire_answers \
	player_frauds player_bonuses accounts payments \
	player_limits player_events player_segments"
GSREPTS="$GSPLYRS report_daily_player_game_summary report_daily_games_brands report_daily_brands"
GSTXS="$GSREPTS sessions manufacturer_sessions game_rounds transactions report_hourly_players"

export GSSOME="$GSBASE"
export GSMORE="$GSPLYRS"
export GSMOST="$GSREPTS"
export GSMAX="$GSTXS"
#endregion gstech
