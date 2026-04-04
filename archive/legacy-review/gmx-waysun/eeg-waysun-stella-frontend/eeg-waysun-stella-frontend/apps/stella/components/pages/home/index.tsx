import React from "react";
import { Header } from "ui";
import { Statistic, Card, Row, Col } from "antd";
import { ArrowUpOutlined } from "@ant-design/icons";
import { Container } from "./index.styled";

const Home = () => {
  return (
    <Container>
      <Row>
        <Col span={24}>
          <Header>Welcome to Stella</Header>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Daily active users"
              value={11.28}
              precision={2}
              valueStyle={{ color: "#6863FB" }}
              prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Weekly active users"
              value={19.3}
              precision={2}
              valueStyle={{ color: "#F29721" }}
              prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Monthly active users"
              value={12.01}
              precision={2}
              valueStyle={{ color: "#F22121" }}
              prefix={<ArrowUpOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Home;
