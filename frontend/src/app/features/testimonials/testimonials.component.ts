import {Component,inject} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {MatIconModule} from '@angular/material/icon';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError,of} from 'rxjs';
@Component({selector:'app-testimonials',standalone:true,imports:[MatIconModule],templateUrl:'./testimonials.component.html',styleUrl:'./testimonials.component.scss'})
export class TestimonialsComponent{
 readonly reviews=toSignal(inject(HttpClient).get<{id:number;overall:number;comment:string}[]>('http://localhost:8080/home/reviews').pipe(catchError(()=>of([]))),{initialValue:[]});
}
