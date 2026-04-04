
def pathprefix($p): if ($p | startswith(".")) then $p else ".\($p)" end;
def strpath($s): getpath(pathprefix($s) | split(".")[1:]);

def unique_w_counts($i): pathprefix($i) as $ip
  | [.[] | {k: strpath($ip)}]
  | group_by(.k)
  | map({($ip[1:]): .[0].k, count: length})
  | sort_by(.count)
  | reverse
  | .[];

def unique_w_counts_compact($i): pathprefix($i) as $ip | unique_w_counts($ip) | {"\(.[$ip[1:]])": .count};

def uwc($i): unique_w_counts($i);
def uwcc($i): unique_w_counts_compact($i);

def filter_in($p; $l): . | map(select(strpath($p) as $t | $l | index($t)));
def filter_out($p; $l): . | map(select(strpath($p) as $t | $l | index($t)|not));
def fo($p; $l): filter_out($p; $l);
def fi($p; $l): filter_in($p; $l);

def parse_tstz($dt): ($dt
  | capture("(?<date>[^T]+)T(?<time>[^Z\\+\\-\\.]+)(\\.[0-9]+)?((?<offo>[\\+\\-])(?<offh>[0-9]{2}):?(?<offm>[0-9]{2}))?Z?")) as $d
  | (if ($d.offo != null)
      then ((if ($d.offo == "-") then 1 else -1 end) * ((($d.offh|tonumber)*60*60) + (($d.offm|tonumber)*60)))
      else 0
    end) as $off
  | ("\($d.date)T\($d.time)Z" | fromdate) + $off;

def tstz($dt): parse_tstz($dt);
def tstz: parse_tstz(.);

# $i users' possibly existing launch.json file
# $t pre-configured launch.json with ports setup
def merge_confs($i; $t): ($t.configurations|map(.+{port: (.port|tonumber)})) as $tc
  | $i.configurations as $ic
  | $i+{configurations: ($ic| map(select(.name | IN($tc[].name) |not))+$tc)};

def hstore_to_str($h): [$h | to_entries[] | "\(.key) => \"\(.value)\""] | join(", ");

def sql_in_str($f): ["'\($f[])'"] | "(" + join(",") + ")";
def sis($f): sql_in_str($f);
def sis: sql_in_str(.);

def find_ngrok_url($p): .tunnels[] | select(.config.addr | endswith($p)) | .public_url;

def resolve_fk_vals($fk): [.[] | .[$fk]] | unique | map(select(. != null)) as $fk_vals
  | if ($fk_vals|length > 0)
      then ($fk_vals | sql_in_str(.))
      else "(0)"
    end;

def report_interceptor($ng): .result[]
  | [(if (.metadata.tenant|IN($ng[])) then "OK" else "EVICTED" end), .metadata.group, .name, .metadata.tenant]
  | @sh;

def report_interceptor_csv($ng): .result[]
  | [(if (.metadata.tenant|IN($ng[])) then "OK" else "EVICTED" end), .metadata.group, .name, .metadata.tenant]
  | @csv;

def round_float: .*100.0 + 0.5|floor/100.0;

def scale:
  if type == "number"
  then (
    if . > 1e6
    then round_float / 1e9 | round_float
    else round_float
    end
  )
  else .
  end;

def update_kv_status:
  . as [$e, $in]
  | $e.status as $es
  | ($in.status
    | map(.metadata as $mdi
      | .+{ metadata: ($mdi+{lease_end: null}) }
  )) as $is
  | $es
  | fo("name"; [$is[].name])
  | map(
    .metadata as $md
    | ( if $md.lease_end == null then ($in.ts|round)
        else $md.lease_end end
      ) as $last_alive
    | .+{
        metadata: ($md+{
          tenant: null,
          expiration: $last_alive,
          lease_end: $last_alive
        })
      }) as $m
  | $in+{status: ($is+$m)};

def parse_tunnel_deets:
    (.metrics | walk(if type == "object" or type == "array" then map_values(scale) else . end)) as $m
    | (.config.addr | capture("(?<proto>tcp|http|https)://(?<name>[^:]+):(?<port>[0-9]+)")) as $c
    | [.name,
        {
          public_url,
          host: $c.name,
          port: $c.port,
          total_requests: $m.http.count,
          req_dur_p50: $m.http.p50,
          req_dur_p90: $m.http.p90,
          req_dur_p95: $m.http.p95,
          req_dur_p99: $m.http.p99,
          req_rate_1m: $m.http.rate1,
          req_rate_5m: $m.http.rate5,
          req_rate_15m: $m.http.rate15,
          total_conns: $m.conns.count,
          open_conns: $m.conns.gauge,
          conn_dur_p50: $m.conns.p50,
          conn_dur_p90: $m.conns.p90,
          conn_dur_p95: $m.conns.p95,
          conn_dur_p99: $m.conns.p99,
          conn_rate_1m: $m.conns.rate1,
          conn_rate_5m: $m.conns.rate5,
          conn_rate_15m: $m.conns.rate15,
        }
      ];

def parse_tunnels: .tunnels
  | (map(parse_tunnel_deets as [$n, $p]
      | [{name: $n}+$p]
    ) | add
    ) as $tns
  | {ts: (now|round|ceil), tunnels: $tns };

def shellify_tunnel_deets: .tunnels
  | map(
    parse_tunnel_deets as [$n, $p]
    | $p | to_entries | map("\(.key)=\"\(.value)\"") | join(" ") as $s
    | [$n, "local \($s)"]
  ) | add | join("\n");

def summarize_reqs($i): (try $i.requests catch $i) as $r
  | $r
  | fo("method"; ["HEAD"])
  | map({
    id,
    tunnel_name,
    remote_addr,
    start,
    start_ts: (.start | tstz),
    duration: (.duration / 1e9),
    duration_ms: (.duration / 1e6),
    module: (.request.uri | capture("/api/v1/(?<module>[^/]+)").module // "??"),
    method: (.request.method),
    uri: (.request.uri),
    resp_status: (.response.status),
    resp_code: (.response.status_code),
  });
def summarize_reqs: summarize_reqs(.);

def update_req_history($do_all):
  . as [$e, $in]
  | (try $in.requests catch $in) as $i
  | ($i|map(select((IN(.id; $e[].id) | not) or ($do_all == "true")))) as $n
  | $e + ($n|summarize_reqs) | sort_by(.start_ts);
def update_req_history: update_req_history(false);

def percentiles($f): . as $in
  | if ($in | length == 0)
    then { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 }
    else ($in | sort_by(strpath($f)) | length) as $l
      | ($in | sort_by(strpath($f))) as $p
      | {
          p50: $p[($l/2|floor)],
          p75: $p[($l*0.75|floor)],
          p90: $p[($l*0.9|floor)],
          p95: $p[($l*0.95|floor)],
          p99: $p[($l*0.99|floor)]
        }
      | map_values(. | strpath($f) * 100 | round / 100)
    end
  | with_entries(.key |= "\($f)_\(.)");

def per_sec_rates($p): . as $in
  | ([$in[].start_ts] | max) as $ts
  | [1,5,15,30,60] as $r
  | $r | map(. as $rr
    | ($in | map(select(.start_ts > ($ts - ($rr * 60)))) | length) as $tr
    | { "\($p)_r\($rr)": ($tr/($rr*60)|round) }
  ) | add;

def status_code_counts: . as $in
  | [$in[].resp_code] as $rsc
  | {
      resp_stat_1xx: ($rsc | map(select((. >= 100) and (. < 200))) | length),
      resp_stat_2xx: ($rsc | map(select((. >= 200) and (. < 300))) | length),
      resp_stat_3xx: ($rsc | map(select((. >= 300) and (. < 400))) | length),
      resp_stat_4xx: ($rsc | map(select((. >= 400) and (. < 500))) | length),
      resp_stat_5xx: ($rsc | map(select(. >= 500)) | length),
    };

def aggregate_req_data($ms): . as $rs
  | $ms
  | map(
    . as $m
    | ($rs | map(select(.resp_code > 0)) | fi("module"; $m) | fo("method"; ["HEAD"])) as $mrs
    | ($mrs | status_code_counts) as $mrss
    | [[$mrs | uwc("method")] | map({"req_mtd_\(.method|ascii_downcase)": .count}) | add] as $mrsmt
    | ((([$mrs[].duration] | add // 0) / length) * 100 | round / 100) as $avgdur
    | ($mrs | percentiles("duration")) as $pctdur
    | ($mrs | per_sec_rates("req")) as $reqrates
    | ($mrs | max_by(.start_ts) | {
        lastreq_addr: .remote_addr,
        lastreq_start: .start_ts,
        lastreq_fmtdt: (try (.start_ts | strflocaltime("%Y-%m-%d %H:%M:%S")) catch null),
        lastreq_dur: (if (.duration != null) then (.duration * 100 | round / 100) else null end),
        lastreq_dur_ms: (.duration_ms // null),
        lastreq_method: .method,
        lastreq_uri: .uri,
        lastreq_status: .resp_status,
        lastreq_code: .resp_code,
    }) as $maxrs
    | {
        module: $m,
        group: ([$mrs[].tunnel_name] | map(select(. != null)) | first),
        req_count: ($mrs | length),
        avg_dur: $avgdur,
        since_last: (if $maxrs.lastreq_start == null then null else (now - $maxrs.lastreq_start | floor) end),
      }
      +$pctdur
      +$reqrates
      +$mrss
      +$mrsmt[]
      +$maxrs
    );

def compute_interceptor_counts: .
  | {
      tunnels: (map(select(.num_modules>0)) | length),
      modules: ([.[].num_modules] | add)
    };

def compile_interceptor_stats:
  . as [$i, $rs, $kv, $tn]
  | (now|floor) as $ts
  | ($i["index"]["payment"]+$i["index"]["wallet"]) as $modules
  | ($rs | aggregate_req_data($modules)) as $reqd
  | [$tn.tunnels[].public_url] as $pubs
  | ($kv.status
    | map({
        module: .name,
        group: .metadata.group,
        kv_lease_start: (.metadata.lease_start // null),
        kv_lease_end: (.metadata.lease_end // null),
        kv_tenant: .metadata.tenant,
        kv_expiry: (.metadata.expiration // null),
        kv_ttl: (
          if (.metadata.expiration != null)
          then ((.metadata.expiration - now)|floor)
          else null
          end
        )
      })
    ) as $kvs
  | $kvs
    | map(.+{
        kv_status: (
          if (.kv_tenant == null or .kv_ttl <= 0) then "expired"
          elif (.kv_tenant as $t | $pubs | index($t)) then "active"
          else "evicted"
          end
        )
      })
    | map(.+if (.kv_status == "active") then {kv_ts: ($kv.ts|ceil), kv_tsfmt: ($kv.ts|ceil|strflocaltime("%Y-%m-%d %H:%M:%S"))} else {} end)
    as $kvss
  | INDEX($reqd[]; .module) as $reqdi
  | [JOIN(
      $reqdi;
      $kvss[];
      "\(.module)";
      {
        ts: $ts,
        tsfmt: ($ts | strflocaltime("%Y-%m-%d %H:%M:%S"))
      }+.[1]+.[0])
    ] as $d
  | INDEX($d[]; .module) as $dx
  | $i["index"]
  | to_entries
  | map(
    .key as $k
    | .value as $v
    | select($k != "unknown")
    | (if ($k == "payment") then env.PAYMENTSERVER_IDFX_PORT else env.WALLETSERVER_IDFX_PORT end) as $p
    | ($tn.tunnels | map(select(.port == $p)) | first) as $t
    | $t+{
        ts: $tn.ts,
        tsfmt: ($tn.ts | strflocaltime("%Y-%m-%d %H:%M:%S")),
        ent_type: "tunnel",
        num_modules: ($v | length),
        _MODULES: [$v | map($dx[.]+{ent_type: "module"})] | add,
      }
  ) as $o
  | $i
  | {
      ts: $ts,
      tsfmt: ($tn.ts | strflocaltime("%Y-%m-%d %H:%M:%S")),
      index,
      data: $o,
      counts: ($o | compute_interceptor_counts)
    };

def sourceable_interceptor_stats: .data
  | map(
    (to_entries | map(
      .key as $k | .value as $v
      | select($k | startswith("_") | not)
      | select($v != null)
      | "\($k)=\"\($v)\""
    ) | join(" ")) as $s
    | (to_entries | map(
      .key as $k | .value as $v
      | select($k | startswith("_"))
      | $v | map(to_entries | map(
        .key as $kk | .value as $vv
        | select($vv != null)
        | "\($kk)=\"\($vv)\""
      ) | join(" ")) as $ss
      | $ss | map("local \(.);")
    ) | add) as $sss
    | ["local \($s);"]+$sss
  ) | add | join("\n");

def get_held_leases:
  . as [$kv, $tn]
  | $kv.status
  | map(select(.metadata.lease_end == null))
  | fi("metadata.tenant"; $tn.tunnels[].public_url)
  | .[].name;

def get_interceptor_counts:
  [.counts.tunnels, .counts.modules] | join("\n");

def active_lease_count:
  [.data[]._MODULES[]] | fi("kv_status"; ["active"]) | length;

def logfile_limits: ([.[].timestamp | tstz] | unique) as $ts
  | "\($ts|min)\n\($ts|max)";


