import { Component, ViewChild, ContentChild, ViewChildren } from '@angular/core';
import { MatTable } from '@angular/material/table';
import { TableVirtualScrollDataSource } from 'ng-table-virtual-scroll';

const DATA = Array.from({length: 1000}, (v, i) => ({
  id: i + 1,
  name: `Element #${i + 1}`,
  fd: i,
  df:2,
}));

@Component({
  selector: 'app-base-example',
  templateUrl: './base-example.component.html',
  styleUrls: ['./base-example.component.css']
})
export class BaseExampleComponent {

  displayedColumns = ['id', 'name' , 'fd', 'df'];

  dataSource = new TableVirtualScrollDataSource(DATA);
  @ContentChild('content') templateContent;
  @ViewChild('content') templateView;
  @ContentChild(MatTable, { static: false })
  table: MatTable<any>;

  @ViewChild(MatTable)
  table2: MatTable<any>;
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    console.log(this.templateContent,  'init', this.templateView, this.table, this.table2);
  }

  ngAfterContentInit(): void {
    //Called after ngOnInit when the component's or directive's content has been initialized.
    //Add 'implements AfterContentInit' to the class.
    console.log(this.templateContent, 'content init',this.templateView, this.table, this.table2);
    
  }
   
  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    console.log(this.templateContent, 'view init', this.templateView, this.table, this.table2);
    
  }
}
