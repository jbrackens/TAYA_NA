// @flow
import type { Content } from 'gstech-core/modules/types/campaigns';
import type { ContentWithLocation } from '../../../types/common';

const pg = require('gstech-core/modules/pg');
const logger = require('gstech-core/modules/logger');
const validate = require('gstech-core/modules/validate');

const repository = require('./repository');
const schemas = require('./schemas');
const { contentDefinitions } = require('./definitions');

const createContent = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('createContent request', { body: req.body });

    const contentDraft = await validate(
      req.body,
      schemas.contentCreateSchema,
      'Content validation failed',
      { context: { type: req.body.type } },
    );

    const content = await repository.createContent(pg, contentDraft);

    const response: DataResponse<Content> = { data: content };
    return res.status(201).json(response);
  } catch (e) {
    logger.error('createContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const createLocalization = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('createLocalization request', { body: req.body });

    const locationDraft = await validate(
      req.body,
      schemas.localizationCreateSchema,
      'Content validation failed',
      { context: { type: 'localization' } },
    );

    const content = await repository.createContent(pg, {
      ...locationDraft,
      brandId: 'LD',
      type: 'localization',
    });

    const response: DataResponse<Content> = { data: content };
    return res.status(201).json(response);
  } catch (e) {
    logger.error('createLocalization error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const deleteContent = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('deleteContent request', { params: req.params });

    const { contentId }: { contentId: string, ... } = req.params;

    const isDeleted = await repository.deleteContent(pg, Number(contentId));

    if (!isDeleted) {
      return res
        .status(409)
        .json({ error: { message: `Not able to delete content ${contentId}` } });
    }

    const response: DataResponse<OkResult> = { data: { ok: true } };
    return res.status(200).json(response);
  } catch (e) {
    logger.error('deleteContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getContent = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('getContent request', { params: req.params });

    const { contentId }: { contentId: Id } = (req.params: any);

    const content = await repository.getContentById(pg, contentId);

    if (!content) {
      return res
        .status(404)
        .json({ error: { message: `Content ${req.params.contentId} not found` } });
    }

    const response: DataResponse<Content> = { data: content };
    return res.send(response);
  } catch (e) {
    logger.error('getContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getContentList = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('getContentList request', { query: req.query });

    const options = validate(req.query, schemas.getContentSchema);

    const content = await repository.getContentList(pg, options);

    const response: DataResponse<ContentWithLocation[]> = { data: content };
    return res.send(response);
  } catch (e) {
    logger.error('getContentList error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const getLocalizations = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    logger.debug('getLocalizations request', { query: req.query });

    const options = validate(req.query, schemas.getLocalizationsSchema);

    const content = await repository.getLocalizations(pg, options);

    const response: DataResponse<Content[]> = { data: content };
    return res.send(response);
  } catch (e) {
    logger.error('getLocalizations error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const initContent = async (
  req: express$Request,
  res: express$Response,
): Promise<express$Response> => {
  try {
    return res.json({ data: contentDefinitions });
  } catch (e) {
    logger.error('initContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

const updateContent = async (req: express$Request, res: express$Response): Promise<any> => {
  try {
    logger.debug('updateContent request', { body: req.body });

    const { contentId } = req.params;
    const dbContent = await pg('content')
      .leftJoin('content_type', 'content_type.id', 'content.contentTypeId')
      .select('content_type.type')
      .where({ 'content.id': contentId })
      .first();

    if (!dbContent) {
      return Promise.reject({ httpCode: 404, message: `Content ${contentId} not found` });
    }

    const { location, ...contentDraft } = validate(
      req.body,
      schemas.contentUpdateSchema,
      'Content validation failed',
      { context: { type: dbContent.type } },
    );
    const updatedContent = await repository.updateContent(
      pg,
      Number(req.params.contentId),
      { ...contentDraft, updatedAt: new Date() },
      location,
    );

    const response: DataResponse<ContentWithLocation> = { data: updatedContent };
    return res.json(response);
  } catch (e) {
    logger.error('updateContent error', e);
    return res.status(e.httpCode || 500).json({ error: { message: e.message } });
  }
};

module.exports = {
  createContent,
  createLocalization,
  deleteContent,
  getContent,
  getContentList,
  getLocalizations,
  initContent,
  updateContent,
};
