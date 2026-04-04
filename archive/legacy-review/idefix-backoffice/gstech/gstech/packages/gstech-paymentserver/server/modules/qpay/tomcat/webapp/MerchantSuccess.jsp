<%@ page
	import="java.util.List,
                 java.util.ArrayList,
                 java.util.Collections,
                 java.util.Iterator,
                 java.util.Enumeration,
                 java.security.MessageDigest,
                 java.util.Map,
                 java.net.URLEncoder,
                 java.util.HashMap,
                 java.util.List,
                 java.*,
                 java.util.Arrays,
                 com.paygate.ag.common.utils.*"%>
<%

String merchantKey=(String)session.getAttribute("merchantKey");
Map fields = new HashMap();
for (Enumeration en = request.getParameterNames(); en.hasMoreElements();) {
	String fieldName = (String) en.nextElement();
	String fieldValue = request.getParameter(fieldName);
	System.out.print("rajesh");out.println("<BR>");
	System.out.print(fieldName+""+fieldValue);
		fields.put(fieldName, fieldValue); 
	 
}
	
	
String txn_response=fields.get("txn_response").toString();out.println("<BR>");
String pg_details=fields.get("pg_details").toString();out.println("<BR>");
String fraud_details=fields.get("fraud_details").toString();out.println("<BR>");
String other_details=fields.get("other_details").toString();out.println("<BR>");

PayGateCryptoUtils payGateCryptoUtils= new PayGateCryptoUtils();

String decryptedTxn_response =   PayGateCryptoUtils.decrypt(txn_response, merchantKey);
String decryptedPg_details = PayGateCryptoUtils.decrypt(pg_details, merchantKey);
String decryptedFraud_details = PayGateCryptoUtils.decrypt(fraud_details, merchantKey);
String decryptedOther_details = PayGateCryptoUtils.decrypt(other_details, merchantKey); 
 
System.out.print(decryptedTxn_response);System.out.println("<BR>");
System.out.print(decryptedPg_details);System.out.println("<BR>");
System.out.print(decryptedFraud_details);System.out.println("<BR>");
System.out.print(decryptedOther_details);System.out.println("<BR>");


String[] txn_response_List=decryptedTxn_response.split("\\|", -1);
String[] pg_details_List=decryptedPg_details.split("\\|", -1);
String[] fraud_details_List=decryptedFraud_details.split("\\|", -1);
String[] other_details_List=decryptedOther_details.split("\\|", -1); 
 

System.out.print(Arrays.toString(txn_response_List));
System.out.print(Arrays.toString(pg_details_List));
System.out.print(Arrays.toString(fraud_details_List));
System.out.print(Arrays.toString(other_details_List));


String  ag_id=txn_response_List[0].toString();
String  me_id=txn_response_List[1].toString();
String  order_no=txn_response_List[2].toString();
String  amount=txn_response_List[3].toString();
String  country=txn_response_List[4].toString();
String  currency=txn_response_List[5].toString();
String  txn_date=txn_response_List[6].toString();
String  txn_time=txn_response_List[7].toString();
String  ag_ref=txn_response_List[8].toString();
String  pg_ref=txn_response_List[9].toString();
String  status=txn_response_List[10].toString();
String  txn_type=txn_response_List[11].toString();
String  res_code=txn_response_List[12].toString();
String  res_message=txn_response_List[13].toString();


String  pg_id=pg_details_List[0].toString();
String  pg_name=pg_details_List[1].toString();
String  paymode=pg_details_List[2].toString();
String  emi_months=pg_details_List[3].toString();
 


String  fraud_action=fraud_details_List[0].toString();
String  fraud_message=fraud_details_List[1].toString();
//String  score=fraud_details_List[2].toString();
 


String  udf_1=other_details_List[0].toString();
String  udf_2=other_details_List[1].toString();
String  udf_3=other_details_List[2].toString();
String  udf_4=other_details_List[3].toString(); 
 
%>
<HTML>
<HEAD>
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.0.0-alpha/js/bootstrap.min.js"></script>
<script type="text/javascript" src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script>
<?php /*?><script type="text/javascript" src="http://formvalidation.io/vendor/formvalidation/js/formValidation.min.js"></script>
<script type="text/javascript" src="http://formvalidation.io/vendor/formvalidation/js/framework/bootstrap.min.js"></script>
<script type="text/javascript" src="http://formvalidation.io/vendor/jquery.steps/js/jquery.steps.min.js"></script><?php */?>
<link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap-theme.min.css" rel="stylesheet" />
<link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet" />
<?php /*?><link href="http://formvalidation.io/vendor/jquery.steps/css/jquery.steps.css" rel="stylesheet" />
<link href="http://formvalidation.io/vendor/formvalidation/css/formValidation.min.css" rel="stylesheet" /><?php */?>
<?php /*?><script type="text/javascript" src="http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/aes.js"></script><?php */?>
<meta charset="utf-8" />
<title>Payment Service Provider | Merchant Accounts</title>
<style>
.has-success .form-control, .has-success .control-label, .has-success .radio, .has-success .checkbox, .has-success .radio-inline, .has-success .checkbox-inline {
	color: #1cb78c !important;
}
.has-success .help-block {
	color: #1cb78c !important;
	border-color: #1cb78c !important;
	box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075), 0 0 6px #1cb78c;
}
.has-error .form-control, .has-error .help-block, .has-error .control-label, .has-error .radio, .has-error .checkbox, .has-error .radio-inline, .has-error .checkbox-inline {
	color: #f0334d;
	border-color: #f0334d;
	box-shadow: inset 0 1px 1px rgba(0, 0, 0, .075), 0 0 6px #f0334d;
}
table {
	color: #333; /* Lighten up font color */
	font-family: 'Raleway', Helvetica, Arial, sans-serif;
	font-weight: bold;
	width: 640px;
	border-collapse: collapse;
	border-spacing: 0;
}
td, th {
	border: 1px solid #CCC;
	height: 30px;
} /* Make cells a bit taller */
th {
	background: #F3F3F3; /* Light grey background */
	font-weight: bold; /* Make sure they're bold */
	font-color: #1cb78c !important;
}
td {
	background: #FAFAFA; /* Lighter grey background */
	text-align: left;
	padding: 2px;/* Center our text */
}
label {
	font-weight: normal;
	display: block;
}
</style>
</HEAD>
<BODY>
<div class="container cs-border-light-blue"> 
  
  <!-- first line -->
  <div class="row pad-top"></div>
  <!-- end first line -->
  
  <div class="equalheight row" style="padding-top: 10px;">
    <div id="cs-main-body" class="cs-text-size-default pad-bottom">
      <div class="col-sm-9  equalheight-col pad-top">
        <div style="padding-bottom: 50px;">
          <h1>Thank you!</h1>
          <div class="row">
            <div class="col-sm-12">
              <legend>Your payemnt is completed. Here is the details for it</legend>
            </div>
            <div class="col-sm-12">
              <legend><%=res_message%></legend>
            </div>
            
            <div class="row">
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Order Number</label>
                      <div class="col-sm-8"><%=order_no%></div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Amount</label>
                      <div class="col-sm-8"><%=currency+' '+amount%></div>
                    </div>
                  </div>
                </div>
                
                
                <div class="row">
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Transaction AG REF</label>
                      <div class="col-sm-8"><%=ag_ref%></div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Transaction PG REF</label>
                      <div class="col-sm-8"><%=pg_ref%></div>
                    </div>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Transaction Status</label>
                      <div class="col-sm-8"><%=status%></div>
                    </div>
                  </div>
                  <div class="col-sm-6">
                    <div class="form-group">
                      <label class="control-label col-sm-4">Transaction Date and Time</label>
                      <div class="col-sm-8"><%=txn_date+' '+txn_time%></div>
                    </div>
                  </div>
                </div>
                
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
</form>
</BODY>
</HTML>