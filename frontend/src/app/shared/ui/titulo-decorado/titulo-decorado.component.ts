import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-titulo-decorado',
  imports: [],
  templateUrl: './titulo-decorado.component.html',
  styleUrl: './titulo-decorado.component.css'
})
export class TituloDecoradoComponent {
  @Input() titulo: string = 'Título padrão';
}
