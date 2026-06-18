/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';

@Module({
  controllers: [MedicinesController],
  providers: [MedicinesService],
})
export class MedicinesModule {}
