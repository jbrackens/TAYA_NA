package tech.argyll.gmx.datacollector.padatafeed.model;

import java.io.InputStream;
import java.util.LinkedList;
import java.util.List;
import javax.xml.bind.JAXBContext;
import javax.xml.bind.JAXBElement;
import javax.xml.bind.JAXBException;
import javax.xml.bind.Unmarshaller;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;

public abstract class ParserBase<ROOT> implements Parser {

  private Class<ROOT> root;
  private JAXBContext jaxbContext;
  private XMLInputFactory xmlInputFactory;

  public ParserBase(Class<ROOT> type) {
    try {
      root = type;
      jaxbContext = prepareContext();
      xmlInputFactory = prepareInputFactory();
    } catch (JAXBException e) {
      throw new IllegalArgumentException("Could not setup parser", e);
    }
  }

  private XMLInputFactory prepareInputFactory() {
    XMLInputFactory xmlInputFactory = XMLInputFactory.newInstance();
    xmlInputFactory.setProperty(XMLInputFactory.SUPPORT_DTD, false);

    return xmlInputFactory;
  }

  private JAXBContext prepareContext() throws JAXBException {
    return JAXBContext.newInstance(root);
  }

  @Override
  public <M> List<M> parse(InputStream input, Class<M> searchFor) {
    List<M> result = new LinkedList<>();
    XMLEventReader xmlEventReader = createXmlEventReader(input);

    try {
      Unmarshaller unMarshaller = jaxbContext.createUnmarshaller();
      String expectedName = getExpectedName(searchFor);

      while (xmlEventReader.hasNext()) {
        XMLEvent xmlEvent = xmlEventReader.peek();
        if (xmlEvent.isStartElement()) {
          StartElement startElement = xmlEvent.asStartElement();
          if (expectedName.equals(startElement.getName().toString())) {
            JAXBElement<M> element = unMarshaller.unmarshal(xmlEventReader, searchFor);
            result.add(element.getValue());
            continue;
          }
        }
        xmlEventReader.nextEvent();
      }
      xmlEventReader.close();
    } catch (XMLStreamException | JAXBException e) {
      throw new IllegalArgumentException("Exception during XML parsing", e);
    }

    return result;
  }

  private XMLEventReader createXmlEventReader(InputStream input) {
    try {
      return xmlInputFactory.createXMLEventReader(input);
    } catch (XMLStreamException e) {
      throw new IllegalArgumentException("Could not create event reader", e);
    }
  }

  private String getExpectedName(Class<?> searchFor) {
    return searchFor.getAnnotation(XmlRootElement.class).name();
  }
}
