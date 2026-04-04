package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.Login.v1.{Login, LoginCustomerId}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class LoginToKeyed extends MapFunction[Login, Tuple2[LoginCustomerId, Login]] {

  override def map(login: Login): Tuple2[LoginCustomerId, Login] = new Tuple2(new LoginCustomerId(login.getCustomerID), login)

}
