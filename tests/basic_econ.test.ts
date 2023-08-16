// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {describe, expect, test} from '@jest/globals';
import request from 'supertest';

import app from '../src/http';

test('HTTP Server Heartbeat', async () => {
    const res = await request(app)
        .get('/api/heartbeat')
        .send();
    expect(res.statusCode).toEqual(200);
});

describe('Basic Account Authentication', () => {
    test('Account creation', async () => {
        const res = await request(app)
            .post('/api/account/signup/')
            .send({ username: 'testuser', password: 'test1234' });
        expect(res.statusCode).toEqual(200);
    });
});

// test('Account creation', () => {

// });