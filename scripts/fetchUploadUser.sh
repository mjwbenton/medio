#!/bin/sh

set -e

aws cloudformation describe-stacks --profile=admin --stack-name MedioUpload --query "Stacks[].Outputs[]" | \
node -r fs -e "console.log(JSON.parse(fs.readFileSync('/dev/stdin', 'UTF-8'))[0].OutputValue)" | \
xargs -n 1 aws secretsmanager get-secret-value --profile=admin --secret-id | \
node -r fs -e "console.log(JSON.parse(fs.readFileSync('/dev/stdin', 'UTF-8')).SecretString)"