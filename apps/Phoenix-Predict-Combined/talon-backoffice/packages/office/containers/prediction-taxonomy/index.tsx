import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import PageHeader from "../../components/layout/page-header";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type {
  Category,
  Series,
} from "@phoenix-ui/api-client/src/prediction-types";

const { Text } = Typography;
const { TextArea } = Input;

const predictionClient = createPredictionClient();

export default function PredictionTaxonomyContainer() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [seriesOpen, setSeriesOpen] = useState(false);
  const [categoryForm] = Form.useForm();
  const [seriesForm] = Form.useForm();
  const { message } = App.useApp();

  const categoryById = useMemo(() => {
    const out: Record<string, Category> = {};
    for (const category of categories) {
      out[category.id] = category;
    }
    return out;
  }, [categories]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [nextCategories, nextSeries, nextTags] = await Promise.all([
        predictionClient.getAdminCategories(),
        predictionClient.getAdminSeries(),
        predictionClient.getAdminTags(),
      ]);
      setCategories(nextCategories || []);
      setSeries(nextSeries || []);
      setTags(nextTags || []);
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to load taxonomy",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCategory(values: Record<string, unknown>) {
    try {
      await predictionClient.createCategory({
        name: values.name as string,
        slug: values.slug as string | undefined,
        icon: values.icon as string | undefined,
        sortOrder: (values.sortOrder as number | undefined) ?? 0,
        active: values.active as boolean | undefined,
      });
      message.success("Category created");
      categoryForm.resetFields();
      setCategoryOpen(false);
      loadData();
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to create category",
      );
    }
  }

  async function handleCreateSeries(values: Record<string, unknown>) {
    try {
      await predictionClient.createSeries({
        title: values.title as string,
        slug: values.slug as string | undefined,
        description: values.description as string | undefined,
        categoryId: values.categoryId as string,
        frequency: values.frequency as string | undefined,
        tags: (values.tags as string[] | undefined) ?? [],
        active: values.active as boolean | undefined,
      });
      message.success("Series created");
      seriesForm.resetFields();
      setSeriesOpen(false);
      loadData();
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to create series",
      );
    }
  }

  return (
    <>
      <PageHeader title="Prediction Taxonomy" />
      <Card>
        <Row justify="space-between" align="middle" className="mb-4">
          <Col>
            <Space size={16}>
              <Text type="secondary">{categories.length} categories</Text>
              <Text type="secondary">{series.length} series</Text>
              <Text type="secondary">{tags.length} active tags</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button onClick={() => setCategoryOpen(true)}>
                Create Category
              </Button>
              <Button type="primary" onClick={() => setSeriesOpen(true)}>
                Create Series
              </Button>
              <Button onClick={loadData}>Refresh</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={10}>
            <Table
              dataSource={categories}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={false}
              columns={[
                {
                  title: "Category",
                  key: "category",
                  render: (_: unknown, record: Category) => (
                    <Space size={6}>
                      {record.icon && <Tag>{record.icon}</Tag>}
                      <Text strong>{record.name}</Text>
                    </Space>
                  ),
                },
                { title: "Slug", dataIndex: "slug", key: "slug", width: 160 },
                {
                  title: "Active",
                  dataIndex: "active",
                  key: "active",
                  width: 90,
                  render: (active: boolean) => (
                    <Tag color={active ? "green" : "default"}>
                      {active ? "Active" : "Hidden"}
                    </Tag>
                  ),
                },
              ]}
            />
          </Col>
          <Col span={14}>
            <Table
              dataSource={series}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 12 }}
              columns={[
                {
                  title: "Series",
                  dataIndex: "title",
                  key: "title",
                  ellipsis: true,
                },
                {
                  title: "Category",
                  dataIndex: "categoryId",
                  key: "categoryId",
                  width: 150,
                  render: (categoryId: string) =>
                    categoryById[categoryId]?.name || categoryId,
                },
                {
                  title: "Tags",
                  dataIndex: "tags",
                  key: "tags",
                  render: (values: string[]) => (
                    <Space size={[4, 4]} wrap>
                      {(values || []).map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Space>
                  ),
                },
                {
                  title: "Active",
                  dataIndex: "active",
                  key: "active",
                  width: 90,
                  render: (active: boolean) => (
                    <Tag color={active ? "green" : "default"}>
                      {active ? "Active" : "Hidden"}
                    </Tag>
                  ),
                },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Modal
        title="Create Category"
        open={categoryOpen}
        onCancel={() => {
          categoryForm.resetFields();
          setCategoryOpen(false);
        }}
        onOk={() => categoryForm.submit()}
        okText="Create Category"
      >
        <Form
          form={categoryForm}
          layout="vertical"
          initialValues={{ active: true, sortOrder: 0 }}
          onFinish={handleCreateCategory}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="World Politics" />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="world-politics" />
          </Form.Item>
          <Form.Item name="icon" label="Icon">
            <Input placeholder="globe" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Sort Order">
            <InputNumber className="w-full" min={0} max={10000} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Series"
        open={seriesOpen}
        onCancel={() => {
          seriesForm.resetFields();
          setSeriesOpen(false);
        }}
        onOk={() => seriesForm.submit()}
        okText="Create Series"
        width={640}
      >
        <Form
          form={seriesForm}
          layout="vertical"
          initialValues={{ active: true, tags: [] }}
          onFinish={handleCreateSeries}
        >
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="2026 Election Watch" />
          </Form.Item>
          <Form.Item name="slug" label="Slug">
            <Input placeholder="2026-election-watch" />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select category"
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="frequency" label="Frequency">
            <Input placeholder="recurring" />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select
              mode="tags"
              tokenSeparators={[",", " "]}
              placeholder="election, polling"
              options={tags.map((tag) => ({ value: tag, label: tag }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
