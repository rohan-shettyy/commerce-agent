FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Dev server runs on 5173
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
