include "tools";

(
  . as [$content, $transformer]
  | $content
  | map(.+$transformer[$t])
  | if ($t == "gstech.payments") then
      map(.+{sessionId: null})
    elif ($t == "gstech.players") then
      map(.+{
        stickyNoteId: null,
        hash: "$2b$10$rl/vYK7JYIJsaKtI/MvnZ.u3z7i.QzT43GiPloJ5BDU.Q6t.MT7Yi",
        tags: (
          .tags as $t
          | if ($t|type == "object") then hstore_to_str($t) else $t end
          ),
        })
    elif ($t == "gstech.risks") then
      map(.+{riskProfiles: ( .riskProfiles as $rp | if ($rp|type == "array") then ($rp|sis|"{\(.[1:-1])}"|gsub("'";"")) else $rp end)})
    elif ($t == "gstech.users") then
      map(.+{hash: "$2a$10$KjzHkwE19ZvH7EbNHQQLWe0DZrpDE8Jc50d1zNRYJyWtsCUHC4r4i"})
    elif ($t == "rewardserver.games") then
      map(.+{tags: hstore_to_str(.tags)})
    elif ($t == "campaignserver.players") then
      map(.+{tags: hstore_to_str(.tags), segments: hstore_to_str(.segments)})
    else .
    end
) as $i
| $i
| .[]
| walk(
    if type == "string"
    then (
      gsub("\\n";"\\n")
      | gsub("\\r";"\\r")
      | gsub("\\t";"\\t")
      | gsub("\"";"\\\"")
    )
    else .
    end
  )