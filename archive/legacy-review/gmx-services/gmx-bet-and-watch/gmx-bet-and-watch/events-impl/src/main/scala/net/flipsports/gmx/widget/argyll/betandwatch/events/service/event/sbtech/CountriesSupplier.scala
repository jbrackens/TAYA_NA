package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech

import java.util
import java.util.function.Supplier
import net.flipsports.gmx.common.internal.partner.sbtech.dict.CountryDictEntry
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.SBTechService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.Country

import scala.collection.JavaConverters.seqAsJavaListConverter
import scala.concurrent.duration._
import scala.concurrent.{Await, ExecutionContext}

class CountriesSupplier(sbtechService: SBTechService)
                       (implicit ec: ExecutionContext)
  extends Supplier[util.List[CountryDictEntry]] {

  override def get(): util.List[CountryDictEntry] = {
    val countries = sbtechService.getCountries()
      .map(_.map(buildEntry).asJava)
    // lib (countryDict) is writen in Java for interoperability, and it's hard to mix Futures there...
    Await.result(countries, 1.second)
  }

  //BS-1491: because of recent sbtech bug mixing code and name fields - this weird condition because we do not know when they fix
  private def buildEntry(country: Country) = {
    if (country.CountryCode.length < country.CountryName.length)
      new CountryDictEntry(country.CountryID, country.CountryCode, country.CountryName)
    else
      new CountryDictEntry(country.CountryID, country.CountryName, country.CountryCode)
  }
}
