import {
  AfterContentInit,
  ContentChild,
  Directive,
  forwardRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
} from "@angular/core";
import { VIRTUAL_SCROLL_STRATEGY } from "@angular/cdk/scrolling";
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";
import { TableVirtualScrollDataSource } from "./table-data-source";
import { MatTable } from "@angular/material/table";
import { FixedSizeTableVirtualScrollStrategy } from "./fixed-size-table-virtual-scroll-strategy";
import { CdkHeaderRowDef } from "@angular/cdk/table";
import { Subject } from "rxjs";

export function _tableVirtualScrollDirectiveStrategyFactory(
  tableDir: TableItemSizeDirective
) {
  return tableDir.scrollStrategy;
}

const stickyHeaderSelector =
  ".mat-header-row .mat-table-sticky, .mat-header-row.mat-table-sticky";
const stickyFooterSelector =
  ".mat-footer-row .mat-table-sticky, .mat-header-row.mat-table-sticky";

const defaults = {
  rowHeight: 48,
  headerHeight: 56,
  headerEnabled: true,
  footerHeight: 48,
  footerEnabled: false,
  bufferMultiplier: 0.7,
};

@Directive({
  selector: "cdk-virtual-scroll-viewport[tvsItemSize]",
  providers: [
    {
      provide: VIRTUAL_SCROLL_STRATEGY,
      useFactory: _tableVirtualScrollDirectiveStrategyFactory,
      deps: [forwardRef(() => TableItemSizeDirective)],
    },
  ],
})
export class TableItemSizeDirective
  implements OnChanges, AfterContentInit, OnDestroy
{
  private destroyed$ = new Subject();

  // tslint:disable-next-line:no-input-rename
  @Input("tvsItemSize")
  rowHeight: string | number = defaults.rowHeight;

  @Input()
  headerEnabled: boolean = defaults.headerEnabled;

  @Input()
  headerHeight: string | number = defaults.headerHeight;

  @Input()
  footerEnabled: boolean = defaults.footerEnabled;

  @Input()
  footerHeight: string | number = defaults.footerHeight;

  @Input()
  bufferMultiplier: string | number = defaults.bufferMultiplier;

  @Input()
  passedMatTable: MatTable<any>;;

  @ContentChild(MatTable, { static: false })
  table: MatTable<any>;

  scrollStrategy = new FixedSizeTableVirtualScrollStrategy();

  dataSourceChanges = new Subject<void>();

  private stickyPositions: Map<HTMLElement, number>;

  constructor(private zone: NgZone) {}

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
    this.dataSourceChanges.complete();
  }

  private isStickyEnabled(): boolean {
    return (
      !!this.scrollStrategy.viewport &&
      (this.table["_headerRowDefs"] as CdkHeaderRowDef[])
        .map((def) => def.sticky)
        .reduce((prevState, state) => prevState && state, true)
    );
  }
  private initMatTable(table) {
    if (table) {
      this.table = table;
      const switchDataSourceOrigin = this.table["_switchDataSource"];
      this.table["_switchDataSource"] = (dataSource: any) => {
        switchDataSourceOrigin.call(this.table, dataSource);
        this.connectDataSource(dataSource);
      };

      this.connectDataSource(this.table.dataSource);

      this.scrollStrategy.stickyChange
        .pipe(
          filter(() => this.isStickyEnabled()),
          // breaks sticky header on the top. needs investigation
          // delayWhen(() => !this.stickyPositions ? timer(0) : of()),
          tap(() => {
            if (!this.stickyPositions) {
              this.initStickyPositions();
            }
          }),
          takeUntil(this.destroyed$)
        )
        .subscribe((stickyOffset) => {
          this.setSticky(stickyOffset);
        });
      console.log("onchanges chld", table, this.table);
    }
  }
  ngAfterContentInit() {
    if (this.table) {
      this.initMatTable(this.table);
    }
  }

  connectDataSource(dataSource: any) {
    this.dataSourceChanges.next();
    if (dataSource instanceof TableVirtualScrollDataSource) {
      dataSource.dataToRender$
        .pipe(
          distinctUntilChanged(),
          takeUntil(this.dataSourceChanges),
          takeUntil(this.destroyed$),
          tap((data) => (this.scrollStrategy.dataLength = data.length)),
          switchMap((data) =>
            this.scrollStrategy.renderedRangeStream.pipe(
              map(({ start, end }) =>
                typeof start !== "number" || typeof end !== "number"
                  ? data
                  : data.slice(start, end)
              )
            )
          )
        )
        .subscribe((data) => {
          this.zone.run(() => {
            dataSource.dataOfRange$.next(data);
          });
        });
    } else {
      throw new Error(
        "[tvsItemSize] requires TableVirtualScrollDataSource be set as [dataSource] of [mat-table]"
      );
    }
  }

  ngOnChanges() {
    console.log(this.table, "table lord", this.passedMatTable);

    if (this.passedMatTable) {
      this.initMatTable(this.passedMatTable);
    }
    const config = {
      rowHeight: +this.rowHeight || defaults.rowHeight,
      headerHeight: this.headerEnabled
        ? +this.headerHeight || defaults.headerHeight
        : 0,
      footerHeight: this.footerEnabled
        ? +this.footerHeight || defaults.footerHeight
        : 0,
      bufferMultiplier: +this.bufferMultiplier || defaults.bufferMultiplier,
    };
    this.scrollStrategy.setConfig(config);
  }

  setSticky(offset: number) {
    this.scrollStrategy.viewport.elementRef.nativeElement
      .querySelectorAll(stickyHeaderSelector)
      .forEach((el: HTMLElement) => {
        const parent = el.parentElement;
        let baseOffset = 0;
        if (this.stickyPositions.has(parent)) {
          baseOffset = this.stickyPositions.get(parent);
        }
        el.style.top = `${baseOffset - offset}px`;
      });
    this.scrollStrategy.viewport.elementRef.nativeElement
      .querySelectorAll(stickyFooterSelector)
      .forEach((el: HTMLElement) => {
        const parent = el.parentElement;
        let baseOffset = 0;
        if (this.stickyPositions.has(parent)) {
          baseOffset = this.stickyPositions.get(parent);
        }
        el.style.bottom = `${-baseOffset + offset}px`;
      });
  }

  private initStickyPositions() {
    this.stickyPositions = new Map<HTMLElement, number>();
    this.scrollStrategy.viewport.elementRef.nativeElement
      .querySelectorAll(stickyHeaderSelector)
      .forEach((el) => {
        const parent = el.parentElement;
        if (!this.stickyPositions.has(parent)) {
          this.stickyPositions.set(parent, parent.offsetTop);
        }
      });
  }
}
