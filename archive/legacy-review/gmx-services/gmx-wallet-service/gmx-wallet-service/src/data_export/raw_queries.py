REPORT_USER_BPR_INC_POINTS_IN_CIRCULATION = '''

with tmp as (
select 
     date_trunc('day', l.operation_date) operation_date_day,
	 date_trunc('month', l.operation_date) operation_date_month,
	 date_trunc('year', l.operation_date) operation_date_year,
	l.operation_date,
   	 l.balance_after,
	 l.operation_type,
	 case l.operation_type when 'BPR' then u.username else null end username,
	 case l.operation_type when 'BPR' then -1*l.amount else 0 end amount_bpr,
	 case l.operation_type when 'INC' then l.amount else 0 end amount_inc
  from wallet_walletline l
  join wallet_wallet w
  on l.wallet_id = w.id
  join auth_user u
  on u.id = w.user_id
  where u.username like 'rmx_%%'
), tmp2 as (
select operation_date_day,
	   operation_date_month,
	   operation_date_year,
	   username,
	   sum(amount_bpr) sum_amount_bpr,
	   sum(amount_inc) sum_amount_inc,
	   sum(amount_inc) - sum(amount_bpr) sum_difference
 from tmp
 group by operation_date_day,
	   operation_date_month,
	   operation_date_year, username
union all
 select each_day, date_trunc('month', each_day), date_trunc('year', each_day), null, 0, 0, 0 from (
	select generate_series (date_trunc('month', %(param)s::date), date_trunc('month', %(param)s::date) + interval '1 month' - interval '1 day', '1 day') each_day ) e
), tmp3 as (
select '01_start' as id, '1900-01-01'::date for_date, count(distinct username) count_username, sum(t2.sum_amount_bpr) sum_amount_bpr, sum(t2.sum_amount_inc) sum_amount_inc, sum(t2.sum_difference) sum_difference from tmp2 t2 where t2.operation_date_month < date_trunc('month', %(param)s::date)  - interval '1 month' group by 1
union all
select '02_last_month', t2.operation_date_month, count(distinct username), sum(t2.sum_amount_bpr) sum_amount_bpr, sum(t2.sum_amount_inc) sum_amount_inc, sum(t2.sum_difference) from tmp2 t2 where t2.operation_date_month = date_trunc('month', %(param)s::date) - interval '1 month' group by t2.operation_date_month
union all
select '03_whole_month', t2.operation_date_day, count(distinct username), sum(t2.sum_amount_bpr) sum_amount_bpr, sum(t2.sum_amount_inc) sum_amount_inc, sum(t2.sum_difference) from tmp2 t2 where t2.operation_date_month = date_trunc('month', %(param)s::date) group by t2.operation_date_day
union all
select '04_whole_year', t2.operation_date_year, count(distinct username), sum(t2.sum_amount_bpr) sum_amount_bpr, sum(t2.sum_amount_inc) sum_amount_inc, sum(t2.sum_difference) from tmp2 t2 where t2.operation_date_day >= date_trunc('year', %(param)s::date) and operation_date_day < date_trunc('year', %(param)s::date) + interval '1 year' group by t2.operation_date_year
)
select id, for_date, count_username,
		sum_amount_bpr,
		sum_amount_inc,
       case id when '04_whole_year' then sum_difference else sum(sum_difference) over(order by id, for_date) end sum_difference
from tmp3'''

"""
id	            for_date	            count_username	   sum_amount_bpr	    sum_amount_inc	    sum_difference
01_start	    1900-01-01 00:00:00+00	0	                   0.00000000	        0.00000000	        0.00000000
02_last_month	2018-02-01 00:00:00+00	49	            17796395.00000000	184799057.65000000	167002662.65000000
03_whole_month	2018-03-01 00:00:00+00	5	             1049040.00000000	  2861913.62500000	168815536.27500000
03_whole_month	2018-03-02 00:00:00+00	5	              578520.00000000  	  2537190.67500000	170774206.95000000
03_whole_month	2018-03-03 00:00:00+00	5	             1982040.00000000	  2382156.97500000	171174323.92500000
03_whole_month	2018-03-04 00:00:00+00	5	              521580.00000000	  2889583.75000000	173542327.67500000
03_whole_month	2018-03-05 00:00:00+00	3	              218040.00000000	  3221284.80000000	176545572.47500000
03_whole_month	2018-03-06 00:00:00+00	4	              417000.00000000	  1280427.82500000	177409000.30000000
03_whole_month	2018-03-07 00:00:00+00	7	             1768385.00000000	  2928356.30000000	178568971.60000000
03_whole_month	2018-03-08 00:00:00+00	2	              568920.00000000	  2819136.55000000	180819188.15000000
03_whole_month	2018-03-09 00:00:00+00	4	              253750.00000000	  2231577.00000000	182797015.15000000
03_whole_month	2018-03-10 00:00:00+00	5	              644705.00000000	  2042828.85000000	184195139.00000000
03_whole_month	2018-03-11 00:00:00+00	13	             1514405.00000000	  4473777.92500000	187154511.92500000
03_whole_month	2018-03-12 00:00:00+00	13	             1926185.00000000	  4204973.87500000	189433300.80000000
03_whole_month	2018-03-13 00:00:00+00	5	              133500.00000000	  2659140.25000000	191958941.05000000
03_whole_month	2018-03-14 00:00:00+00	14	             1443110.00000000	  3156856.15000000	193672687.20000000
03_whole_month	2018-03-15 00:00:00+00	18	             2151935.00000000	  2561770.50000000	194082522.70000000
03_whole_month	2018-03-16 00:00:00+00	5	             1301420.00000000	  3780138.60000000	196561241.30000000
03_whole_month	2018-03-17 00:00:00+00	3	              498600.00000000	  2457684.00000000	198520325.30000000
03_whole_month	2018-03-18 00:00:00+00	6	              725645.00000000	  4162239.70000000	201956920.00000000
03_whole_month	2018-03-19 00:00:00+00	15	              804690.00000000	  4011498.40000000	205163728.40000000
03_whole_month	2018-03-20 00:00:00+00	14	             1296740.00000000	  2767811.70000000	206634800.10000000
03_whole_month	2018-03-21 00:00:00+00	8	             2035200.00000000	  2521051.50000000	207120651.60000000
03_whole_month	2018-03-22 00:00:00+00	4	             1937165.00000000	  1273837.15000000	206457323.75000000
03_whole_month	2018-03-23 00:00:00+00	6	             3063185.00000000	  1654207.67500000	205048346.42500000
03_whole_month	2018-03-24 00:00:00+00	9	             1073105.00000000	  2308043.97500000	206283285.40000000
03_whole_month	2018-03-25 00:00:00+00	6	             1141920.00000000	  2908006.70000000	208049372.10000000
03_whole_month	2018-03-26 00:00:00+00	5	              677750.00000000	  2085066.67500000	209456688.77500000
03_whole_month	2018-03-27 00:00:00+00	7	              639490.00000000	  1819301.37500000	210636500.15000000
03_whole_month	2018-03-28 00:00:00+00	7	             1316165.00000000	  2039155.75000000	211359490.90000000
03_whole_month	2018-03-29 00:00:00+00	0	                   0.00000000	  1803147.55000000	213162638.45000000
04_whole_year	2018-01-01 00:00:00+00	179	            49478585.00000000	262641223.45000000	213162638.45000000
"""

REPORT_USER_WALLET_BALANCE_STATUS = '''
with wallet as (
	select l.wallet_id,
           l.operation_type,
           l.operation_subtype,
           l.operation_date,
	       l.amount,
	       case
	          when l.operation_subtype <> 'MCR' and l.operation_type = 'INC' then 'FINAL_INC'
	          when l.operation_subtype = 'MCR' and l.operation_type = 'BPR' then 'FINAL_INC'
	          when l.operation_subtype <> 'MCR' and l.operation_type = 'BPR' then 'FINAL_BPR'
	          when l.operation_subtype = 'MCR' and l.operation_type = 'INC' then 'FINAL_BPR'
	          else 'UNKNOWN' 
	       end final_operation,
	       date_trunc('DAY', operation_date) operation_date_day,
	       date_trunc('MONTH', operation_date) operation_date_month,
	       date_trunc('WEEK', operation_date) operation_date_week
	FROM wallet_walletline l 
	where l.operation_type IN ('BPR', 'INC')
), last_redeemed_amount_sql as (
    select wallet_id, 
	       -1 * amount last_redeemed_amount, 
	       operation_date last_redeemed_at, 
	       row_number() over (partition by wallet_id order by operation_date desc) rn_lra 
	 from wallet where final_operation = 'FINAL_BPR'
), points_erned_sql as (
    select wallet_id, 
	       sum(amount) points_earned_lifetime
	  from wallet
	where final_operation = 'FINAL_INC' group by 1
), points_erned_sql_2 as (
    select wallet_id, 
	       sum(amount) points_earned_current_month
	  from wallet
	where final_operation = 'FINAL_INC' and operation_date_month = date_trunc('MONTH', current_date) group by 1
), points_erned_sql_3 as (
    select wallet_id, 
	       sum(amount) points_earned_yesterday
	  from wallet
	where final_operation = 'FINAL_INC' and operation_date_day = current_date - interval '1 day' group by 1
), points_erned_sql_7 as (
    select wallet_id, 
	       sum(amount) points_earned_last_7_days
	  from wallet
	where final_operation = 'FINAL_INC' and operation_date_day >= current_date - interval '7 days' group by 1
), points_erned_sql_30 as (
    select wallet_id, 
	       sum(amount) points_earned_last_30_days
	  from wallet
	where final_operation = 'FINAL_INC' and operation_date_day >= current_date - interval '30 days' group by 1
), points_erned_sql_week as (
    select wallet_id, 
	       sum(amount) points_earned_current_week
	  from wallet
	where final_operation = 'FINAL_INC' and operation_date_week >= date_trunc('week', current_date) group by 1
)
select a.username, 
       w.current_balance, 
       last_redeemed_amount, 
	   last_redeemed_at, 
	   points_earned_lifetime, 
	   points_earned_current_month, 
	   points_earned_yesterday, 
	   points_earned_last_30_days, 
	   points_earned_last_7_days,
	   points_earned_current_week
  from wallet_wallet w
  LEFT JOIN last_redeemed_amount_sql lra
    ON lra.wallet_id=w.id
	AND lra.rn_lra = 1
  LEFT JOIN points_erned_sql p on p.wallet_id=w.id 
  LEFT JOIN points_erned_sql_2 p2 on p2.wallet_id=w.id 
  LEFT JOIN points_erned_sql_3 p3 on p3.wallet_id=w.id 
  LEFT JOIN points_erned_sql_7 p7 on p7.wallet_id=w.id 
  LEFT JOIN points_erned_sql_30 p30 on p30.wallet_id=w.id 
  LEFT JOIN points_erned_sql_week pw on pw.wallet_id=w.id 
  join auth_user a on w.user_id = a.id
'''

"""
username	                            current_balance	        last_redeemed_amount	last_redeemed_at	points_earned_lifetime	points_earned_current_month	points_earned_yesterday	points_earned_last_30_days	points_earned_last_7_days	points_earned_current_week
rmx_3d042ab67a7e4d40b4910730d4b1fa05	1000.00000000			1000.00000000					
rmx_36b7f098921b44f5b91f6f12e32b5318	5871.50000000			5871.50000000					
rmx_2d8ec4823eff4cc7af26b5b99c2e09c1	1025.00000000			1025.00000000					
rmx_dadcbbaa67a34da592a1ba0d81385142	1125.00000000			1125.00000000					
rmx_9a6cde8b885746568853c7b56a3047b4	0.00000000	            1100.00000000	        2018-11-22 18:15:53.987888+00	1100.00000000			1100.00000000		
rmx_7697d88294c44181bdf7e6d8e6eb5b83	258.25000000	        1100.00000000	        2018-06-25 21:39:01.1227+00	1358.25000000					
rmx_14ffda9ddb8a4a50b5c29f7a10674c34	13198.50000000			13198.50000000					
rmx_3c35f790d71146c5aa0e8c1457206bf7	80.00000000			    80.00000000					
"""
