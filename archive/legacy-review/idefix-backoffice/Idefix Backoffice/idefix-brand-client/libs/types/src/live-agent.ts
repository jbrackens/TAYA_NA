export interface LiveAgentParam {
  name: string;
  value: string;
}

export interface LiveAgent {
  id: string;
  script: string;
  buttonId: string;
  params: LiveAgentParam[];
  visitor?: {
    email: string;
    name: string;
  };
}
