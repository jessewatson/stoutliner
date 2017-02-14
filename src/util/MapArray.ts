
export interface ValueHolder<V>
{
  index:number;
  id:number;
  value:V;
}

export default class MapArray<V>
{
  constructor()
  {
    this.hash = {};
    this.idArray = [];
  }
  
  private hash: { [id: number] : ValueHolder<V> } = {};
  private idArray: Array<number>;

  set(id:number, value:V, index:number=null)
  {
    // if they did not provide an index
    if( index == null || index < 0 )
    {
      // if the id doesn't already exist
      if( this.hash[id] == null )
      {
        // add it to the end of our array
        this.idArray.push(id);
        // record the index for saving further down
        index = this.idArray.length;
      }
      else // if the id already exists, grab its index
      // (they didn't provide an index, so they aren't interested in changing its position)
      {
        // record the index for saving further down
        index = this.hash[id].index;
      }
    }
    else // they provided an index
    {
      // if the id exists
      if( this.hash[id] != null )
      {
        // remove it from its current location (but use our own index rather than trusting theirs)
        this.idArray.splice(this.hash[id].index, 1);
      }
      // lastly, insert the id at the provided index
      this.idArray.splice(index, 0, id);
    }

    // finally, update our index, value, and id
    this.hash[id] = { 
      index:index, 
      id:id, 
      value:value
    };
  }

  getLength()
  {
    return this.idArray.length;
  }

  getById(id:number): ValueHolder<V>
  {
    return this.hash[id];
  }

  getValueById(id:number): V
  {
    return this.hash[id].value;
  }

  getIndexById(id:number):number
  {
    return this.hash[id].index;
  }

  getByIndex(i:number): ValueHolder<V>
  {
    return this.hash[this.idArray[i]];
  }

  getValueByIndex(i:number): V
  {
    return this.hash[this.idArray[i]].value;
  }

  getIdByIndex(i:number): number
  {
    return this.hash[this.idArray[i]].id;
  }

  isValidIndex(i:number): boolean
  {
    if( i >= 0 && i < this.idArray.length )
    {
      return true;
    }

    return false;
  }


}