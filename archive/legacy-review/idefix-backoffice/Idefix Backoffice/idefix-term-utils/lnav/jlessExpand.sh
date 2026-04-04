#!/bin/bash
# TODO this might be fixable with jq and map_values(. | @sh)
kitty @ launch --no-response --env PAYLD="$1" zsh -c \
"echo $(cat <<"EOF"
$PAYLD
EOF
) | jless";
