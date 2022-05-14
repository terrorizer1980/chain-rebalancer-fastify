FROM node:14-alpine3.13 as builder

ARG CI=true

RUN apk add --no-cache bash ca-certificates git build-base python2 ;\
    rm -rf /var/cache/apk/*

WORKDIR /app

COPY package*.json ./

# RUN npm audit --audit-level=moderate
RUN npm install --no-fund

# web3 1.3.4 affected https://www.npmjs.com/advisories/877/versions , so we use 1.3.4-rc.2
RUN npm outdated || true

COPY . .
RUN npm run build

 # CMD ["sleep", "3d"]
# ################################################################################

FROM node:14-alpine3.13

LABEL website="Secure Docker Images https://secureimages.dev"
LABEL description="We secure your business from scratch."
LABEL maintainer="hireus@secureimages.dev"

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=node:node /app .

USER node

CMD ["npm", "start"]
