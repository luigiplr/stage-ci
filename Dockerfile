FROM node:8.11.1-slim

RUN apt-get -y update && apt-get -y install git

WORKDIR /stage-ci

COPY package.json .
RUN npm install --production

ADD . .

RUN npm run build

EXPOSE 3000

CMD npm start
