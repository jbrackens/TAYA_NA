/* @flow */
const { v1: uuid } = require('uuid');
const { xmlEncode, parse } = require('gstech-core/modules/soap');
const logger = require('gstech-core/modules/logger');
const { axiosRetry } = require('gstech-core/modules/axios');
const { getConf } = require('./MicrogamingGame');

const doRequest = async (brandId: BrandId, method: string, body: string) => {
  const id = uuid();
  const conf = getConf();
  const options = {
    method: 'POST',
    url: conf.apiUrl,
    headers: {
      'content-type': 'text/xml',
      soapaction: `http://mgsops.net/AdminAPI_Admin/IVanguardAdmin2/${method}`,
      'request-id': id,
    },
    auth: {
      username: conf.brands[brandId].orionLogin,
      password: conf.brands[brandId].orionPassword,
    },
    data: body,
    responseType: 'text',
  };
  logger.debug('>>>>>>> MicroGaming SOAP', { id, options });
  const { data: result } = await axiosRetry(options);
  const content = await parse(result);
  logger.debug('<<<<<<< MicroGaming SOAP', { id, content });
  return content.Envelope.Body[0];
};

const getRollbackQueueData = async (brandId: BrandId): Promise<any> | Promise<Array<any>> => {
  const conf = getConf();
  logger.debug('>>>>> MicroGaming ROLLBACKQUEUE', { brandId });
  const result = await doRequest(brandId, 'GetRollbackQueueData',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
      <soapenv:Header/>
      <soapenv:Body>
        <adm:GetRollbackQueueData>
          <adm:serverIds>
            <arr:int>${conf.brands[brandId].serverId}</arr:int>
          </adm:serverIds>
        </adm:GetRollbackQueueData>
      </soapenv:Body>
    </soapenv:Envelope>`);
  logger.debug('<<<<< MicroGaming ROLLBACKQUEUE', { result });
  if (result.Fault) {
    logger.warn('XXXXX MicroGaming ROLLBACKQUEUE [skipping invalid response]', { result });
    return [];
  }
  return result.GetRollbackQueueDataResponse[0].GetRollbackQueueDataResult[0].QueueDataResponse || [];
};

const getCommitQueueData = async (brandId: BrandId): Promise<any> | Promise<Array<any>> => {
  const conf = getConf();
  logger.debug('>>>>> MicroGaming COMMITQUEUEDATA', { brandId });
  const result = await doRequest(brandId, 'GetCommitQueueData',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
      <soapenv:Header/>
        <soapenv:Body>
          <adm:GetCommitQueueData>
            <adm:serverIds>
              <arr:int>${conf.brands[brandId].serverId}</arr:int>
            </adm:serverIds>
          </adm:GetCommitQueueData>
        </soapenv:Body>
      </soapenv:Envelope>`);
  if (result.Fault) {
    logger.warn('XXXXX MicroGaming COMMITQUEUEDATA [skipping invalid response]', { result });
    return [];
  }
  logger.debug('<<<<< MicroGaming COMMITQUEUEDATA', { result });
  return result.GetCommitQueueDataResponse[0].GetCommitQueueDataResult[0].QueueDataResponse || [];
};

const getFailedEndGameQueue = async (brandId: BrandId): Promise<any> | Promise<Array<any>> => {
  const conf = getConf();
  logger.debug('>>>>> MicroGaming FAILEDENDGAMEQUEUE', { brandId });
  const result = await doRequest(brandId, 'GetFailedEndGameQueue',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
      <soapenv:Header/>
      <soapenv:Body>
        <adm:GetFailedEndGameQueue>
          <adm:serverIds>
            <arr:int>${conf.brands[brandId].serverId}</arr:int>
           </adm:serverIds>
         </adm:GetFailedEndGameQueue>
       </soapenv:Body>
     </soapenv:Envelope>`);
  logger.debug('<<<<< MicroGaming FAILEDENDGAMEQUEUE', JSON.stringify(result, null, 2));
  if (result.Fault) {
    logger.warn('XXXXX MicroGaming FAILEDENDGAMEQUEUE [skipping invalid response]', { result });
    return [];
  }
  return result.GetFailedEndGameQueueResponse[0].GetFailedEndGameQueueResult[0].QueueDataResponse || [];
};

const manuallyValidateBet = async (brandId: BrandId, type: 'RollbackQueue' | 'CommitQueue', userId: string, rowId: number, externalReference: string): Promise<any> => {
  const conf = getConf();

  const result = await doRequest(brandId, 'ManuallyValidateBet',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin" xmlns:ori="http://schemas.datacontract.org/2004/07/Orion.Contracts.VanguardAdmin.DataStructures">
      <soapenv:Header/>
        <soapenv:Body>
          <adm:ManuallyValidateBet>
            <adm:validateRequests>
              <ori:ValidteBetRequest>
                <ori:ExternalReference>${externalReference}</ori:ExternalReference>
                <ori:RowId>${rowId}</ori:RowId>
                <ori:ServerId>${conf.brands[brandId].serverId}</ori:ServerId>
                <ori:UnlockType>${type}</ori:UnlockType>
                <ori:UserId>${userId}</ori:UserId>
              </ori:ValidteBetRequest>
            </adm:validateRequests>
          </adm:ManuallyValidateBet>
        </soapenv:Body>
      </soapenv:Envelope>`);
  logger.debug('manuallyValidateBet', JSON.stringify(result));
  return result.ManuallyValidateBetResponse[0].ManuallyValidateBetResult;
};

const manuallyCompleteGame = async (brandId: BrandId, rowId: number): Promise<any> => {
  const conf = getConf();

  const result = await doRequest(brandId, 'ManuallyCompleteGame',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin" xmlns:ori="http://schemas.datacontract.org/2004/07/Orion.Contracts.VanguardAdmin.DataStructures">
      <soapenv:Header/>
      <soapenv:Body>
        <adm:ManuallyCompleteGame>
          <adm:requests>
            <ori:CompleteGameRequest>
              <ori:RowId>${rowId}</ori:RowId>
              <ori:RowIdLong>${rowId}</ori:RowIdLong>
              <ori:ServerId>${conf.brands[brandId].serverId}</ori:ServerId>
            </ori:CompleteGameRequest>
          </adm:requests>
        </adm:ManuallyCompleteGame>
      </soapenv:Body>
    </soapenv:Envelope>`);
  logger.debug('manuallyCompleteGame', JSON.stringify(result));
  return result.ManuallyCompleteGame[0].ManuallyCompleteGame;
};

const validateApiUser = async (brandId: BrandId, username: string, password: string): Promise<any> => {
  const result = await doRequest(brandId, 'ValidateApiUser',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:adm="http://mgsops.net/AdminAPI_Admin">
      <soapenv:Header/>
      <soapenv:Body>
        <adm:ValidateApiUser>
          <adm:username>${xmlEncode(username)}</adm:username>
          <adm:password>${xmlEncode(password)}</adm:password>
        </adm:ValidateApiUser>
      </soapenv:Body>
    </soapenv:Envelope>`);
  return result.ValidateApiUserResponse[0].ValidateApiUserResult;
};

module.exports = {
  getRollbackQueueData,
  getCommitQueueData,
  manuallyValidateBet,
  getFailedEndGameQueue,
  manuallyCompleteGame,
  validateApiUser,
};
