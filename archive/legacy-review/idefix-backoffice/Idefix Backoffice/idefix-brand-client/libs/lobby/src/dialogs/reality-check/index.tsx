import * as React from "react";
import { RealityCheck as RealityCheckType } from "@brandserver-client/types";
import Component from "./Component";

interface Props {
  popupFrequency: number;
  statistics: {
    AmountWin?: string;
    AmountLose?: string;
    PlayTimeMinutes: number;
  };
  isOpen: boolean;
  fetchRealityCheck: () => Promise<RealityCheckType>;
  acceptRealityCheck: (status: boolean) => void;
}

class RealityCheck extends React.Component<Props, { listener: any }> {
  private popupTimer: number | null;

  constructor(props: Props) {
    super(props);

    this.state = {
      listener: null
    };

    this.popupTimer = null;
  }

  async componentDidMount() {
    window.brandserver = {
      addRealityCheckListener: (listener: any) => {
        if (listener !== undefined) {
          return this.setState({ listener: listener });
        }
      }
    };

    const {
      popupFrequency,
      statistics: { PlayTimeMinutes }
    } = await this.getStatistics();

    const popupShowDate =
      localStorage.getItem("popupShowDate") &&
      new Date(localStorage.getItem("popupShowDate") as string);

    const popupShown = !!JSON.parse(
      localStorage.getItem("popupShown") as string
    );
    const skippedPopupShow = popupShowDate && popupShowDate < new Date();
    const isSameSession = PlayTimeMinutes >= popupFrequency;

    if ((popupShown || skippedPopupShow) && isSameSession) {
      this.handlePopup();
      return;
    }

    this.calculateNextPopupDate(popupFrequency, PlayTimeMinutes);
  }

  componentWillUnmount() {
    if (this.popupTimer) {
      clearTimeout(this.popupTimer);
    }
  }

  calculateNextPopupDate = (
    popupFrequency: number,
    PlayTimeMinutes: number
  ) => {
    const date = new Date();
    const nextPopupTime = popupFrequency - (PlayTimeMinutes % popupFrequency);
    const nextPopupDate = new Date(
      date.setMinutes(date.getMinutes() + nextPopupTime)
    ).toString();

    localStorage.setItem("popupShowDate", nextPopupDate);
    this.popupTimer = window.setTimeout(
      this.handlePopup,
      nextPopupTime * 1000 * 60
    );
  };

  getStatistics = () => this.props.fetchRealityCheck();

  handlePopup = () => {
    const { isOpen, acceptRealityCheck } = this.props;
    const { listener } = this.state;

    if (!!window.brandserver && listener && !isOpen) {
      listener();
    }

    this.getStatistics();
    localStorage.setItem("popupShown", `${!isOpen}`);
    acceptRealityCheck(!isOpen);
  };

  handleContinue = () => {
    const {
      statistics: { PlayTimeMinutes },
      popupFrequency
    } = this.props;
    this.calculateNextPopupDate(popupFrequency, PlayTimeMinutes);
    this.handlePopup();
  };

  render() {
    const { isOpen, statistics } = this.props;

    return isOpen ? (
      <Component statistics={statistics} onContinue={this.handleContinue} />
    ) : null;
  }
}

export default RealityCheck;
