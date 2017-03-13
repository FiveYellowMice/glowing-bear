#!/bin/bash

echo "Start deplying..."

if [ ! -d ~/.ssh ]; then mkdir ~/.ssh; fi
wget https://github.com/FiveYellowMice/secret/raw/master/travis-glowing-bear.enc
openssl aes-256-cbc -k $SSH_PASSWORD -in travis-glowing-bear.enc -out ~/.ssh/id_rsa -d
chmod 600 ~/.ssh/id_rsa

ssh_run() {
  ssh -o StrictHostKeyChecking=no \
    -o LogLevel=ERROR \
    git@$DEPLOY_SERVER $@
}

ssh_run echo test
rm -f travis-glowing-bear.enc
rsync -re ssh \
  --delete-after \
  --exclude=/.git \
  --exclude=/node_modules/ \
  --exclude=/bower_components/ \
  ./ git@$DEPLOY_SERVER:/srv/irc/glowing-bear
