import { CampaignStatus, AudienceType } from "app/types";

export interface ICampaignInfo {
  id: number;
  brandId: string;
  name: string;
  status: CampaignStatus;
  startTime: string | null;
  endTime: string | null;
  audienceType: AudienceType;
  creditMultiple: boolean;
  previewMode: boolean;
  groupId: number | null;
  group: { name: string; campaigns: { id: number; name: string }[] };
}

export interface IFormValues {
  name: string;
  startTime: string | null;
  endTime: string | null;
  audienceType?: AudienceType;
  brandId: string;
  groupId?: number | null;
  group?: { name: string; campaigns: { id: number; name: string }[] };
}
