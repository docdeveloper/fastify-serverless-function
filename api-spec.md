# API spec

## Users

### Get all users

GET /users

### Get a specific user

GET /users/{userId}

### Get info about admin users

GET /users/admin

Authorization: Bearer YOUR_TOKEN_HERE

Access to info about an admin user is blocked. It requires a token.

Authorization: Bearer YOUR_TOKEN_HERE

## Posts

### Get all posts

GET /posts

### Get all posts with multiple headers

GET /posts

Accept: application/json User-Agent: TechWriterWorkshop/1.0

### Get a specific post

GET /posts/{postId}

### Create a post

POST /posts

Content-Type: application/json

{ "title": "My Workshop Post", "body": "Learning about REST APIs is fun!",
"userId": 1 }

### Update an entire post (PUT)

PUT /posts/{postId}

Content-Type: application/json

{ "id": 1, "title": "Updated Title", "body": "Updated body", "userId": 1 }

### Update part of a post (PATCH)

PATCH /posts/{postId}

Content-Type: application/json

{ "title": "Only Title Changed" }

### Delete a post

DELETE /posts/{postId}

## Comments

### Get comments for a specific post

GET /posts/{postId}/comments

## Token

Exercise: Get a token using the Oauth flow.

### OAuth 2.0 Authentication Flow Exercise

### This demonstrates a typical OAuth flow with our API

# Variables for this exercise

@baseUrl = thisServer @clientId = workshop_client_12345 @clientSecret =
secret_abc123xyz789 @tokenEndpoint = {{baseUrl}}/oauth/token @apiEndpoint =
{{baseUrl}}/api/v1

### STEP 1: Obtain Access Token

# @name getToken

POST {{tokenEndpoint}}

Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials &client_id={{clientId}}
&client_secret={{clientSecret}} &scope=read:data write:data

### STEP 2: Extract the token from the response

# The REST Client extension allows us to capture values from previous requests

# Use the response from the request named "getToken"

@accessToken = {{getToken.response.body.access_token}} @tokenType =
{{getToken.response.body.token_type}}

### STEP 3: Make an authenticated GET request

GET {{apiEndpoint}}/users

Authorization: {{tokenType}} {{accessToken}}

Accept: application/json

### STEP 4: Make an authenticated POST request

POST {{apiEndpoint}}/documents Authorization: {{tokenType}} {{accessToken}}
Content-Type: application/json

{ "title": "My Workshop Document", "content": "This was created using an OAuth
token", "category": "workshop" }

### STEP 5: Check token information (if API supports it)

GET {{apiEndpoint}}/oauth/token/info

Authorization: {{tokenType}} {{accessToken}}

### STEP 6: Make request with expired/invalid token (to see error handling)

GET {{apiEndpoint}}/users

Authorization: Bearer invalid_token_example Accept: application/json
