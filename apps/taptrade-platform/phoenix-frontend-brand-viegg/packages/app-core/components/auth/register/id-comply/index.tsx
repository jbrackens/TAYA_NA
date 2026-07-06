import React, { useState } from "react";
import { useTranslation } from "i18n";
import { Row, Col } from "antd";
import { QuestionType } from "..";
import { CoreModal } from "../../../ui/modal";
import { CoreForm } from "../../../ui/form";
import { CoreButton } from "../../../ui/button";
import { CoreAlert } from "../../../ui/alert";
import { useAnswerKbaQuestions } from "../../../../services/go-api";
import type { AppError } from "../../../../services/go-api";

type IdComplyProps = {
  isVisible: boolean;
  setIsVisible: (arg: boolean) => void;
  data: Array<QuestionType>;
};

const IdComplyComponent: React.FC<IdComplyProps> = ({
  isVisible,
  setIsVisible,
  data,
}) => {
  const { t } = useTranslation(["register"]);
  const answerMutation = useAnswerKbaQuestions();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSelect = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  };

  const handleSubmit = () => {
    const formattedAnswers = data.map((q) => ({
      question_id: q.questionId,
      answer: answers[q.questionId] || "",
    }));

    answerMutation.mutate(
      { answers: formattedAnswers },
      {
        onSuccess: () => {
          setAnswers({});
          setIsVisible(false);
        },
      },
    );
  };

  const answerError = answerMutation.error as AppError | undefined;

  return (
    <CoreModal
      title={t("KBA_TITLE", "Identity Verification")}
      centered
      visible={isVisible}
      onCancel={() => setIsVisible(false)}
      footer={null}
      maskClosable={false}
    >
      <CoreForm name="kbaForm" colon={false}>
        {data.map((question, qIndex) => (
          <div key={question.questionId} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 600 }}>
              {qIndex + 1}. {question.text}
            </p>
            {question.choices.map((choice) => (
              <Row key={choice} style={{ marginBottom: 4 }}>
                <Col span={24}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`kba-${question.questionId}`}
                      value={choice}
                      checked={answers[question.questionId] === choice}
                      onChange={() => handleSelect(question.questionId, choice)}
                      style={{ marginRight: 8 }}
                    />
                    {choice}
                  </label>
                </Col>
              </Row>
            ))}
          </div>
        ))}

        {answerError && (
          <Row style={{ marginBottom: 16 }}>
            <Col span={24}>
              <CoreAlert
                message={t(
                  "KBA_ERROR",
                  "Unable to verify your identity. Please try again.",
                )}
                type="error"
                showIcon
              />
            </Col>
          </Row>
        )}

        <CoreButton
          type="primary"
          size="large"
          block
          onClick={handleSubmit}
          loading={answerMutation.isLoading}
          disabled={data.some((q) => !answers[q.questionId])}
        >
          {t("KBA_SUBMIT", "Submit Answers")}
        </CoreButton>
      </CoreForm>
    </CoreModal>
  );
};

export { IdComplyComponent };
