package com.flip.kafka.opta;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Properties;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.GZIPInputStream;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import com.google.common.io.Resources;

/**
 * Hello world!
 *
 */
public class KafkaChinaConsumer implements Runnable {

	public static void main(String[] args) throws IOException {
		
		final File dir = new File(args[0]);
		
		if (!dir.exists()) {
			System.err.println("path " + args[0] + " doesn't exist");
			System.exit(1);
		}
		
		if (!dir.isDirectory()) {
			System.err.println("path " + args[0] + " exists, but it's not a directory");
			System.exit(1);
		}	
		
		final ExecutorService executor = Executors.newFixedThreadPool(10);
		
		final KafkaConsumer<String, byte[]> consumer;
		
		try (InputStream props = Resources.getResource("kafka.properties").openStream()) {
			Properties properties = new Properties();
			properties.load(props);
			
			verifyEnvVar("ssl.keystore.location", properties);
			verifyEnvVar("ssl.truststore.location", properties);
			verifyEnvVar("ssl.truststore.password", properties);
			verifyEnvVar("ssl.keystore.password", properties);
			verifyEnvVar("ssl.key.password", properties);
			verifyEnvVar("bootstrap.servers", properties);
			verifyEnvVar("group.id", properties);
			
			consumer = new KafkaConsumer<>(properties);
		}
		consumer.subscribe(Arrays.asList("opta-data"));

		while (true) {
			ConsumerRecords<String, byte[]> records = consumer.poll(200);
			
			if (records.count() > 0) {
				Iterator<ConsumerRecord<String, byte[]>> it = records.iterator();
				
				while (it.hasNext()) {
					executor.submit(new KafkaChinaConsumer(dir, it.next()));
				}
			}
			
		}
	}
	
	private static void verifyEnvVar(String key, Properties properties) {
		if (System.getProperty(key) == null) {
			System.err.println("You must supply '" + key + "' environment variable to the program");
			System.exit(1);
		} else {
			properties.setProperty(key, System.getProperty(key));
		}
	}
	
	private File dir;
	
	private ConsumerRecord<String, byte[]> message;
	
	public KafkaChinaConsumer(File dir, ConsumerRecord<String, byte[]> message) {
		this.dir = dir;
		this.message = message;
	}

	@Override
	public void run() {
		try {
			InputStream ungzippedResponse = new GZIPInputStream(new ByteArrayInputStream(message.value()));
			StringWriter swIn = new StringWriter();
			IOUtils.copy(ungzippedResponse, swIn, "utf-8");
			DocumentBuilder builder = DocumentBuilderFactory.newInstance().newDocumentBuilder();
		    Document xml = builder.parse(new InputSource(new StringReader(swIn.toString())));
		    
		    StringWriter swOut = new StringWriter();
			Transformer t = TransformerFactory.newInstance().newTransformer();
	        t.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
	        t.setOutputProperty(OutputKeys.INDENT, "yes");
	        t.transform(new DOMSource(xml), new StreamResult(swOut));
	        
		    String filename = xml.getFirstChild().getAttributes().getNamedItem("x-meta-default-filename").getNodeValue();
			FileUtils.write(new File(dir, filename), swOut.toString());
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}