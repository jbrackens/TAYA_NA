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
                 com.paygate.ag.common.utils.*"%>
<%
	Map fields = new HashMap();
	for (Enumeration en = request.getParameterNames(); en.hasMoreElements();) {
		String fieldName = (String) en.nextElement();
		String fieldValue = request.getParameter(fieldName);
		 
		 
			fields.put(fieldName, fieldValue); 
		 
	}
	String txn_details = fields.get("ag_id").toString() + '|' + fields.get("me_id").toString() + '|'+ fields.get("order_no").toString() + '|' + fields.get("amount").toString() + '|'+ fields.get("country").toString() + '|' + fields.get("currency").toString() + '|'	+ fields.get("txn_type").toString() + '|' + fields.get("success_url").toString() + '|'+ fields.get("failure_url").toString() + '|' + fields.get("channel").toString();
	String me_id = fields.get("me_id").toString();
	 
	String pg_details = fields.get("pg_id").toString() + '|' + fields.get("paymode").toString() + '|'+ fields.get("scheme").toString() + '|' + fields.get("emi_months").toString();
	String card_details = fields.get("card_no").toString() + '|' + fields.get("exp_month").toString() + '|'+ fields.get("exp_year").toString() + '|' + fields.get("cvv2").toString() + '|'
			+ fields.get("card_name").toString();
	String cust_details = fields.get("cust_name").toString() + '|' + fields.get("email_id").toString() + '|'
			+ fields.get("mobile_no").toString() + '|' + fields.get("unique_id").toString() + '|'
			+ fields.get("is_logged_in").toString();
	String bill_details = fields.get("bill_address").toString() + '|' + fields.get("bill_city").toString() + '|'
			+ fields.get("bill_state").toString() + '|' + fields.get("bill_country").toString() + '|'
			+ fields.get("bill_zip").toString();
	String ship_details = fields.get("ship_address").toString() + '|' + fields.get("ship_city").toString() + '|'
			+ fields.get("ship_state").toString() + '|' + fields.get("ship_country").toString() + '|'
			+ fields.get("ship_zip").toString() + '|' + fields.get("ship_days").toString() + '|'
			+ fields.get("address_count").toString();
	String item_details = fields.get("item_count").toString() + '|' + fields.get("item_value").toString() + '|'
			+ fields.get("item_category").toString();
	String other_details = fields.get("udf_1").toString() + '|' + fields.get("udf_2").toString() + '|'
			+ fields.get("udf_3").toString() + '|' + fields.get("udf_4").toString() + '|'
			+ fields.get("udf_5").toString();
	String merchant_key=fields.get("me_key").toString();
	
	session.setAttribute("merchantKey", merchant_key);
	
	System.out.println("txn_details"+txn_details);
	System.out.println("pg_details"+pg_details);	 
	System.out.println("card_details"+card_details);	 
	System.out.println("cust_details"+cust_details);	 
	System.out.println("bill_details"+bill_details);	 
	System.out.println("ship_details"+ship_details);	 
	System.out.println("item_details"+item_details);	 
	System.out.println("other_details"+other_details);	 
	
	
	  PayGateCryptoUtils payGateCryptoUtils= new PayGateCryptoUtils();
	
	String Encrypted_txn_details = payGateCryptoUtils.encrypt(txn_details, merchant_key);
	String Encrypted_pg_details = payGateCryptoUtils.encrypt(pg_details, merchant_key);
	String Encrypted_card_details = payGateCryptoUtils.encrypt(card_details, merchant_key);
	String Encrypted_cust_details = payGateCryptoUtils.encrypt(cust_details, merchant_key);
	String Encrypted_bill_details = payGateCryptoUtils.encrypt(bill_details, merchant_key);
	String Encrypted_ship_details= payGateCryptoUtils.encrypt(ship_details, merchant_key);
	String Encrypted_item_details = payGateCryptoUtils.encrypt(item_details, merchant_key);
	String Encrypted_other_details = payGateCryptoUtils.encrypt(other_details, merchant_key);
	
	
	System.out.println("Encrypted_txn_details"+Encrypted_txn_details);
	System.out.println("Encrypted_pg_details"+Encrypted_pg_details);	 
	System.out.println("Encrypted_card_details"+Encrypted_card_details);	 
	System.out.println("Encrypted_cust_details"+Encrypted_cust_details);	 
	System.out.println("Encrypted_bill_details"+Encrypted_bill_details);	 
	System.out.println("Encrypted_ship_details"+Encrypted_ship_details);	 
	System.out.println("Encrypted_item_details"+Encrypted_item_details);	 
	System.out.println("Encrypted_other_details"+Encrypted_other_details);	   
%>


<html>
<head>
<title>DirecPay Merchant Integration</title>
</head>
<body>

	<form name="ecom" method="post"
		action="https://test.avantgardepayments.com/agcore/payment">
		<input type="hidden" name="me_id" value="<%=me_id%>"> 
		<input type="hidden" name="txn_details" value="<%=Encrypted_txn_details%>"> 
		<input type="hidden" name="pg_details" value="<%=Encrypted_pg_details%>"> 
		<input type="hidden" name="card_details" value="<%=Encrypted_card_details%>"> 
		<input type="hidden" name="cust_details" value="<%=Encrypted_cust_details%>"> 
		<input type="hidden" name="bill_details" value="<%=Encrypted_bill_details%>"> 
		<input type="hidden" name="ship_details" value="<%=Encrypted_ship_details%>"> 
		<input type="hidden" name="item_details" value="<%=Encrypted_item_details%>"> 
		<input type="hidden" name="other_details" value="<%=Encrypted_other_details%>"> 
		<input type="submit" name="submit" value="Submit Transaction Request">
	</form>
</body>
</html>