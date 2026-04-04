package net.flipsports.gmx.streaming.internal.customers.operation.dto

import net.flipsports.gmx.streaming.internal.customers.operation.Types

case class Streams(customers: Types.Streams.PreJoinCustomerStream, logins: Types.Streams.PreJoinLoginStream, customerLogins: Types.Streams.CustomerLoginStream)