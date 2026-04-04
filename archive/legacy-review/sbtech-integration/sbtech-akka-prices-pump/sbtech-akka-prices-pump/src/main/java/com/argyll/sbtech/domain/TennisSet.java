package com.argyll.sbtech.domain;

import java.math.BigDecimal;

import com.thoughtworks.xstream.annotations.XStreamAlias;
import com.thoughtworks.xstream.annotations.XStreamAsAttribute;

public class TennisSet {

    @XStreamAsAttribute
    @XStreamAlias("Player1")
    public BigDecimal player1;
    
    @XStreamAsAttribute
    @XStreamAlias("Player2")
    public BigDecimal player2;
}
