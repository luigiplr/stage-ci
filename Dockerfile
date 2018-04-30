FROM node:8.11.1

RUN apt-get -y update && apt-get -y install git

WORKDIR /stage-ci

ADD . .
RUN npm install --production
RUN npm run build

EXPOSE 3000

CMD npm start
