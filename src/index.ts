#!/usr/bin/env node

import { config } from 'dotenv';

import MarkovClient from './MarkovClient';

config();

const client = new MarkovClient();
client.start();
