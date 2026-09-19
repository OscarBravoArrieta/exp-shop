import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

import { Box } from '@primeicons/angular/box';
import { Tablet } from '@primeicons/angular/tablet';
import { User } from '@primeicons/angular/user';
import { Users } from '@primeicons/angular/users';
import { Calendar } from '@primeicons/angular/calendar';
import { Envelope } from '@primeicons/angular/envelope';
import { UserEdit } from '@primeicons/angular/user-edit';
import { SignOut } from '@primeicons/angular/sign-out';
import { SignIn } from '@primeicons/angular/sign-in';
import { ShoppingCart } from '@primeicons/angular/shopping-cart';
import { Bell } from '@primeicons/angular/bell';

import { ImageModule } from 'primeng/image';
import { SpeedDialModule } from 'primeng/speeddial';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { MenuModule } from 'primeng/menu';
import { DynamicDialogModule } from 'primeng/dynamicdialog';

@NgModule({
    imports: [
        CommonModule,
        InputTextModule,
        ButtonModule,
        Box,
        Tablet,
        User,
        Users,
        Calendar,
        Envelope,
        UserEdit,
        SignOut,
        SignIn,
        ShoppingCart,
        Bell,
        ImageModule,
        SpeedDialModule,
        BadgeModule,
        OverlayBadgeModule,
        MenuModule,
        DynamicDialogModule,
    ],
    exports: [
        InputTextModule,
        ButtonModule,
        Box,
        Tablet,
        User,
        Users,
        Calendar,
        Envelope,
        UserEdit,
        SignOut,
        SignIn,
        ShoppingCart,
        Bell,
        ImageModule,
        SpeedDialModule,
        BadgeModule,
        OverlayBadgeModule,
        MenuModule,
        DynamicDialogModule,
    ],
})
export class PrimeNgModule {}
