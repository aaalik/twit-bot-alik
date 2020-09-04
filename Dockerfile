FROM node:12

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/

RUN npm install
RUN npm install -g forever
COPY . /usr/src/app/

EXPOSE 8000
CMD [ "forever", "alik.js" ]
