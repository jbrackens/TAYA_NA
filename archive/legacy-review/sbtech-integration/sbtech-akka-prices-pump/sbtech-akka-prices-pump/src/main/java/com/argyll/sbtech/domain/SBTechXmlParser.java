package com.argyll.sbtech.domain;

import com.argyll.domain.Price;
import com.thoughtworks.xstream.XStream;
import com.thoughtworks.xstream.converters.basic.DateConverter;
import com.thoughtworks.xstream.io.naming.NoNameCoder;
import com.thoughtworks.xstream.io.xml.DomDriver;

public class SBTechXmlParser implements Parser {
    
    final XStream xstream;
    
    public SBTechXmlParser() {
        xstream = new XStream(new DomDriver("UTF-8", new NoNameCoder()));
        xstream.registerConverter(new DateConverter("yyyy-MM-dd'T'HH:mm:ss", null));
        xstream.registerConverter(new PriceConverter(Price.Type.AMERICAN));
        xstream.processAnnotations(Events.class);
        xstream.alias("Sets", TennisSet.class);
        xstream.alias("Set1", TennisSet.class);
        xstream.alias("Set2", TennisSet.class);
        xstream.alias("Set3", TennisSet.class);
    }

    @Override
    public Events parse(String str) {
        return (Events) xstream.fromXML(str);
    }

}
