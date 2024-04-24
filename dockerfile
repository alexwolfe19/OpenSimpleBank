FROM node:10.3.10
WORKDIR /app

COPY ./prisma /app/prisma
COPY ./public /app/public
COPY ./src /app/src
COPY ./tests /app/tests
COPY ./.eslintrc.js /app/.eslintrc.js
COPY ./jest.config.js /app/jest.config.js
COPY ./package.json /app/package.json
COPY ./tsconfig.json /app/tsconfig.json

RUN npm ci
RUN npm run build
ENV PORT=3000

EXPOSE 3000

CMD [ "node", "dist/index.js" ]