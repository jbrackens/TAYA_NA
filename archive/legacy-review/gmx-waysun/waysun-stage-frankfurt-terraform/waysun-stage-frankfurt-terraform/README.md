### waysun-stage-frankfurt-infrastructure-orchestration

The keys for instances can be found in 1pass:

- Main ssh key for bastion and EC2 instances

```
key:ssh-priv:alicloud:waysun-stage-frankfurt:waysun-stage-ssh.priv:::wysun-stage-frankfurt:eu-central-1,frankfurt
key:ssh-pub:alicloud:waysun-stage-frankfurt:waysun-stage-ssh.pub:::wysun-stage-frankfurt:eu-central-1,frankfurt
```

- NiFi and Nifi-registry

```
key:ssh-priv:alicloud:waysun-stage-frankfurt:waysun-stage-nifi-ssh.priv:::wysun-stage-frankfurt:eu-central-1,frankfurt
key:ssh-pub:alicloud:waysun-stage-frankfurt:waysun-stage-nifi-ssh.priv:::wysun-stage-frankfurt:eu-central-1,frankfurt
```

- NiFi-registry
  You need to create tunnel via bastion to access nifi-registry: http://127.0.0.1:33333/nifi-registry
  To start docker container with nifi-registry:

```
docker run -d --restart unless-stopped --name=nifi-registry -p 0.0.0.0:8080:8080 --env NIFI_REGISTRY_WEB_HTTP_PORT=8080 --env JVM_OPTS="-Xmx512m -Xms512m -XX:MaxPermSize=512m" --volume=/nifi-data/conf/providers.xml:/opt/nifi-registry/nifi-registry-current/conf/providers.xml --volume=/nifi-data/conf/registry-aliases.xml:/opt/nifi-registry/nifi-registry-current/conf/registry-aliases.xml --volume=/nifi-data/flow-storage:/opt/nifi-registry/nifi-registry-current/flow_storage --volume=/nifi-data/database:/opt/nifi-registry/nifi-registry-current/database apache/nifi-registry:0.5.0
```

- Zookeeper and Kafka cluster

```
Kafka Aliyun service still in use but EMR Kafka in testing phase.
```

For security reason you need to edit variables.tf and provide the RDS username,password and DB name.
The credentials can be found in 1pass

- RDS

```
staging_rds_database_name              = "" # 1pass db:alicloud:waysun-stage-frankfurt-rds:waysun-stage-database:::wysun-stage-frankfurt:eu-central-1,frankfurt
staging_rds_database_username          = "" # 1pass db:alicloud:waysun-stage-frankfurt-rds:waysun-stage-database:::wysun-stage-frankfurt:eu-central-1,frankfurt
staging_rds_database_password          = "" # 1pass db:alicloud:waysun-stage-frankfurt-rds:waysun-stage-database:::wysun-stage-frankfurt:eu-central-1,frankfurt
```

- Redis

```
redis_accounts = "" # 1pass redis:alicloud:waysun-stage-frankfurt-redis:::wysun-stage-frankfurt:eu-central-1,frankfurt
```

### Remote state

Terraform keeps track of the infrastructure within terraform.tfstate and terraform.tfstate.backup
Without those files Terraform will try to recreate all the infrastructure by building eveything again.
It was decided to upload the tfstate to encrypted S3 with versioning enabled. The script will auto find the newest tfstate.
The approach eliminates requirment to encrypt and upload Terraform tfstate to github every time the infrastructure is changed.

It was decided to use S3 for remote state instead of OSS becasue versiong is available only in ap-south-1 region

As backend is located on AWS S3 ws-a-rem-bucket via user ws-a-rem-bucket-access:

- Init:

creds:aws,iam:fs-mgmt:ws-a-rem-bucket-access:::waysun,aliyun.alicloud,terraform:eu-west-1

```

aws configure
terraform init -backend-config "bucket=fs-ws-rem-bucket" -backend-config "access_key=" -backend-config "secret_key=

```

### AliCloud repository

Images will be created and pushed as part of Jenkins piepline at the final stage.
Right now we push images manually to AliCloud repositories.
Each RAM user has to generate new docker password for himself

```

docker login --username=1pass-item registry.cn-beijing.aliyuncs.com
docker tag [ImageId] registry.cn-beijing.aliyuncs.com/waysun-prod-namespace/waysun-prod-oidc-repo:[tag]
docker push registry.cn-beijing.aliyuncs.com/waysun-prod-namespace/waysun-prod-oidc-repo:[tag]

```

### IP and ports

Unknown at this stage.

### Certificates

Certificates has to be generated outside of the Aliyun.

### DNS

DNS - subdomain will be managed from Terraform on Aliyun.

### k8s ACK API access

For security reason the API access over internet EIP was removed.
The only way to access the k8s API from remote location is to create SSH tunnel via bastion.
I use RoyalTSX and working tunnel configuration is configured on royalTSX.
There is one more change you need to do on kubectl config file.
You need specify 127.0.0.1:tunnel_port as IP address in ./kube/config file

```
apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:33335
```

### Aditional steps to automate PK20210223

### Provision new data disk - only new deployment

```
apt install xfsprogs
file -s /dev/vdb -- if getting data as output
mkfs -t xfs /dev/vdb
file -s /dev/vdb - confirm file system exists e.g: /dev/vdb: SGI XFS filesystem data (blksz 4096, inosz 512, v2 dirs)

```

### Nifi additional steps

```
mkdir /home/root
mkdir /nifi-data/conf
mkdir /nifi-data/logs
chown -R nifi:nifi /nifi-data

```

### Nifi-registry

/nifi-data/conf/registry-aliases.xml

```

<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<aliases>
   <alias>
       <internal>NIFI_REGISTRY_1</internal>
       <external>http:/NIFI_REGISTERY_ADDRESS.internal:8080</external>
   </alias>
</aliases>
```

cat providers.xml

```
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<providers>
  <flowPersistenceProvider>
    <class>org.apache.nifi.registry.provider.flow.FileSystemFlowPersistenceProvider</class>
    <property name="Flow Storage Directory">./flow_storage</property>
  </flowPersistenceProvider>
  <extensionBundlePersistenceProvider>
    <class>org.apache.nifi.registry.provider.extension.FileSystemBundlePersistenceProvider</class>
    <property name="Extension Bundle Storage Directory">./extension_bundles</property>
  </extensionBundlePersistenceProvider>
</providers>
```

### Generate new key - only new deployment

Generate new priv and pub keys for EC2 on local machine (Mac/Linux only)

```
ssh-keygen -t ed25519 -b 4096 -C "support@flipsports.com" -f name_of_the_key
mv name_of_the_key name_of_the_key.priv
cp name_of_the_key.priv ~/.ssh
chmod 400 ~/.ssh/name_of_the_key.priv
```

Dont forget to upload to 1pass!!!
