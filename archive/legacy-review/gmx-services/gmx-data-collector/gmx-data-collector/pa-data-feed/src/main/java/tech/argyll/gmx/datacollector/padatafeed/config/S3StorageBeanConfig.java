package tech.argyll.gmx.datacollector.padatafeed.config;

import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3Client;
import java.util.Arrays;
import org.apache.camel.Processor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.argyll.gmx.datacollector.common.camel.ProcessorGroup;
import tech.argyll.gmx.datacollector.common.camel.S3MetadataProcessor;
import tech.argyll.gmx.datacollector.common.camel.SetHeaderProcessor;
import tech.argyll.gmx.datacollector.padatafeed.camel.image.PrepareImageStorageProcessor;
import tech.argyll.gmx.datacollector.padatafeed.camel.intake.PrepareIntakeStorageProcessor;

@Configuration
@ConditionalOnProperty(name = "app.env.storage.mode", havingValue = "s3")
public class S3StorageBeanConfig {

  @Bean
  @SuppressWarnings("deprecation")
  public AmazonS3 s3Client() {
    return new AmazonS3Client();
  }

  @Bean
  @SuppressWarnings("deprecation")
  public AmazonS3 s3ClientAuthenticated(@Value("${AWS_ACCESS_KEY_ID:}") String accessKey,
      @Value("${AWS_SECRET_ACCESS_KEY:}") String secret) {
    return new AmazonS3Client(new BasicAWSCredentials(accessKey, secret));
  }

  @Bean
  public Processor intakeStorageProcessorGroup(PrepareIntakeStorageProcessor prepareIntakeStorageProcessor) {
    return new ProcessorGroup(Arrays.asList(prepareIntakeStorageProcessor,
        new SetHeaderProcessor("CamelAwsS3CannedAcl", "Private"),
        new S3MetadataProcessor("CamelAwsS3UserMetadata")
    ));
  }

  @Bean
  public Processor imageStorageProcessorGroup(PrepareImageStorageProcessor prepareImageStorageProcessor) {
    return new ProcessorGroup(Arrays.asList(prepareImageStorageProcessor,
        new SetHeaderProcessor("CamelAwsS3CannedAcl", "PublicRead"),
        new SetHeaderProcessor("CamelAwsS3ContentType", "image/png")
    ));
  }
}
