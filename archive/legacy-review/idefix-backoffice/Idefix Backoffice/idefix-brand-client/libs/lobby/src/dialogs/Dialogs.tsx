import { RealityCheck as RealityCheckType } from "@brandserver-client/types";
import * as React from "react";
import { connect } from "react-redux";
import { bindActionCreators, Dispatch } from "redux";
import {
  getQuestionnaires,
  getTermsConditionStatus,
  submitQuestionnaire
} from "../app";
import { LobbyState } from "../lobby";
import {
  acceptRealityCheck,
  fetchRealityCheck,
  fetchTermsConditionsContent
} from "./actions";
import Questionnaire from "./questionnaire";
import RealityCheck from "./reality-check";
import { getRealityCheck, getTermsConditions } from "./selectors";
import TermsConditions from "./terms-conditions";

interface StateProps {
  termsConditionIsOpen: boolean;
  requiredQuestionnaires: string[];
  termsConditions: {
    termsConditions: string;
    privacyPolicy: string;
    bonusTerms: string;
  };
  realityCheck: {
    isOpen: boolean;
  } & RealityCheckType;
}

interface DispatchProps {
  actions: {
    acceptRealityCheck: (status: boolean) => void;
    fetchRealityCheck: () => any;
    fetchTermsConditionsContent: () => any;
    submitQuestionnaire: (id: string, data: Record<string, unknown>) => any;
  };
}

type Props = StateProps & DispatchProps;

const Dialogs = ({
  termsConditions,
  termsConditionIsOpen,
  requiredQuestionnaires,
  realityCheck,
  actions
}: Props) => {
  const renderDialog = () => {
    if (termsConditionIsOpen) {
      return (
        <TermsConditions
          content={termsConditions}
          fetchTermsConditionsContent={actions.fetchTermsConditionsContent}
        />
      );
    }

    if (requiredQuestionnaires.length) {
      return (
        <Questionnaire
          requiredQuestionnaires={requiredQuestionnaires}
          onSubmitQuestionnaire={actions.submitQuestionnaire}
        />
      );
    }
  };

  return (
    <React.Fragment>
      <RealityCheck
        {...realityCheck}
        fetchRealityCheck={actions.fetchRealityCheck}
        acceptRealityCheck={actions.acceptRealityCheck}
      />
      {renderDialog()}
    </React.Fragment>
  );
};

const mapStateToProps = (state: LobbyState): StateProps => ({
  realityCheck: getRealityCheck(state),
  termsConditionIsOpen: getTermsConditionStatus(state),
  termsConditions: getTermsConditions(state),
  requiredQuestionnaires: getQuestionnaires(state)
});

const mapDispatchToProps = (dispatch: Dispatch): DispatchProps => ({
  actions: bindActionCreators(
    {
      fetchRealityCheck,
      acceptRealityCheck,
      fetchTermsConditionsContent,
      submitQuestionnaire
    },
    dispatch
  )
});

export default connect(mapStateToProps, mapDispatchToProps)(Dialogs);
