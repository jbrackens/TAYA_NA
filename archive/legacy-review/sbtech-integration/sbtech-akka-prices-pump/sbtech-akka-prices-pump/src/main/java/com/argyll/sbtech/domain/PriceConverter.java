package com.argyll.sbtech.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

import com.argyll.domain.Price;
import com.thoughtworks.xstream.converters.Converter;
import com.thoughtworks.xstream.converters.MarshallingContext;
import com.thoughtworks.xstream.converters.UnmarshallingContext;
import com.thoughtworks.xstream.converters.basic.AbstractSingleValueConverter;
import com.thoughtworks.xstream.io.HierarchicalStreamReader;
import com.thoughtworks.xstream.io.HierarchicalStreamWriter;

public class PriceConverter extends AbstractSingleValueConverter {
    
    private final Price.Type type;
    
    public PriceConverter(Price.Type type) {
        this.type = type;
    }

    public PriceConverter() {
        this(Price.Type.DECIMAL);
    }
    
    public Object fromString(String str) {
        return Price.from(new BigDecimal(str), type);
    }
    
    public String toString(Object obj) {
        return obj == null ? null : ((Price)obj).toString(type);
    }

    public boolean canConvert(Class clazz) {
        return clazz.equals(Price.class);
    }
}
