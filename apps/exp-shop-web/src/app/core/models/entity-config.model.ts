import { Type } from '@angular/core';
import { Observable } from 'rxjs';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

export interface EntityConfig<T = any> {
    title: string; //caption of the table and name of the exported file
    form: Type<unknown>; //Dynamic Dialog to open
    dialog?: Partial<DynamicDialogConfig>; //only the options that differ from the default ones
    load: () => Observable<T[]>; //reloads the data after saving or deleting
    remove?: (row: T) => Observable<boolean>; //if not defined, the delete button is hidden
    describe?: (row: T) => string; //text shown in the delete confirmation
    savedMsg: string; //message shown after saving
}
