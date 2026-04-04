// @flow
export type SftpConfig ={
  host: string,
  port: number,
  username: string,
  password: string,
  brandSuffix: string,
  folderReg: string,
  folderSales: string,
  enabled?: boolean,
  onBootEnabled?: boolean,
};

const Client = require('ssh2-sftp-client');

const getConnection = async (cfg: SftpConfig) =>{
  const sftp = new Client();
  await sftp.connect(cfg);
  return sftp;
};

const DownloadFile = async (cfg: SftpConfig, rmt: string, dst: any, options: any): Object  => {
  const connection = await getConnection(cfg);
  await connection.get(rmt, dst, options);
  await connection.end();
};

const List = async (cfg: SftpConfig, path: ?string): Promise<{name: string}[]> => {
  const connection = await getConnection(cfg);
  const fileList = await connection.list(path);
  await connection.end();
  return fileList;
};

const GetFileData = async (cfg: SftpConfig, filePath: string, encoding?: string): Object  => {
  const sftp = await new Client();
  try {
    await sftp.connect(cfg)
    const data = await sftp.get(filePath)
    return data.toString(encoding);
  } finally {
    sftp.end()
  }
}

module.exports = {
  DownloadFile,
  List,
  GetFileData,
};
