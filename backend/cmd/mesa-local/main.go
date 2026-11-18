package main

import (
 "backend/src/config"
 "backend/src/db"
 "context"
 "encoding/json"
 "fmt"
 "os"
)

func main() {
 cfg,err:=config.Load(".env"); if err!=nil { panic(err) }
 conn,err:=db.Open(context.Background(),cfg.Database); if err!=nil { panic(err) }; defer conn.Close()
 if len(os.Args)>1 { panic("read-only audit") }
 for _,q:=range []string{
 `SELECT row_to_json(s) FROM schema_migrations s`,
 `SELECT json_build_object('id',id,'name',name) FROM product_types ORDER BY id`,
 `SELECT json_build_object('id',id,'name',name) FROM brands`,
 `SELECT json_build_object('id',id,'name',name,'quantity',quantity,'measurements',measurements) FROM products WHERE lower(name) LIKE '%mesa%' OR lower(name) LIKE '%americano%'`,
 } {
 rows,err:=conn.Query(q); if err!=nil {panic(err)}
 for rows.Next(){var b json.RawMessage; if err:=rows.Scan(&b);err!=nil{panic(err)};fmt.Println(string(b))};if err:=rows.Err();err!=nil{panic(err)};rows.Close()
 }
}
