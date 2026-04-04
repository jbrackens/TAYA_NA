create type game_profile_risk_profile as enum('low', 'medium_low', 'medium', 'medium_high', 'high');

alter table game_profiles add column "riskProfile" game_profile_risk_profile not null default 'low';
