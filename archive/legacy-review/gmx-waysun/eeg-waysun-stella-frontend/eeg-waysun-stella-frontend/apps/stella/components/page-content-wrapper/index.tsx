import { Col } from "antd";
import { useTranslation } from "next-export-i18n";
import React, { FC, ReactNode } from "react";
import { Fragment } from "react";
import {
  Container,
  MainContainer,
  SingleSection,
  SectionTitle,
  Subtitle,
  Title,
  MulitpleSectionContainer,
  Optional,
} from "./index.styled";

type SectionContent = {
  id: string;
  title?: string;
  isOptional?: boolean;
  content: ReactNode;
  isHidden?: boolean;
  titleHighlighted?: boolean;
  span?: number;
};

type Section = SectionContent | Array<SectionContent>;

type PageContentWrapperProps = {
  title?: string;
  subTitle?: string;
  sections?: Array<Section>;
};

export const PageContentWrapper: FC<PageContentWrapperProps> = ({
  title,
  subTitle,
  sections,
  children,
}) => {
  const { t } = useTranslation();

  const generateSections = () =>
    sections?.map((section, idx) => {
      if (!Array.isArray(section)) {
        return (
          <Fragment key={idx}>
            {!section.isHidden && (
              <SingleSection>
                {section.title && (
                  <SectionTitle titleHighlighted={section.titleHighlighted}>
                    {section.title}{" "}
                    {section.isOptional && (
                      <Optional>{`(${t("OPTIONAL")})`}</Optional>
                    )}
                  </SectionTitle>
                )}
                {section.content}
              </SingleSection>
            )}
          </Fragment>
        );
      } else {
        return (
          <MulitpleSectionContainer key={idx} gutter={12}>
            {section.map((el) => (
              <Fragment key={`${idx}-${el.id}`}>
                {!el.isHidden && (
                  <Col span={el.span ? el.span : 12}>
                    {el.title && (
                      <SectionTitle titleHighlighted={el.titleHighlighted}>
                        {el.title}{" "}
                        {el.isOptional && (
                          <Optional>{`(${t("OPTIONAL")})`}</Optional>
                        )}
                      </SectionTitle>
                    )}
                    {el.content}
                  </Col>
                )}
              </Fragment>
            ))}
          </MulitpleSectionContainer>
        );
      }
    });

  return (
    <MainContainer>
      <Title>{title}</Title>
      <Subtitle>{subTitle}</Subtitle>
      <Container>
        {generateSections()}
        {children}
      </Container>
    </MainContainer>
  );
};
