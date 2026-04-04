import { SubscriptionType } from "@brandserver-client/types";

export enum Step {
  Subscriptions = 1,
  Confirmation = 2,
  Result = 3
}

export type PromotionType = "email" | "sms";

export interface EmailFromValues {
  emails: SubscriptionType | "snoozed";
}

export interface SmsFormValues {
  smses: SubscriptionType | "snoozed";
}

export type FormValues = EmailFromValues | SmsFormValues;
